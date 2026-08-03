import os
import json
import base64
from typing import Optional, Dict, Any
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from google import genai
from google.genai import types

app = FastAPI(title="FinAgent - Trợ Lý Tín Dụng Zalo")

def get_gemini_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Thiếu GEMINI_API_KEY trong Environment Variables.")
    return genai.Client(api_key=api_key)

SYSTEM_INSTRUCTION = """
Bạn là FinAgent - Trợ lý Tín dụng AI chuyên nghiệp trên nền tảng Zalo, tư vấn và thẩm định tín dụng cho Ngân hàng dành cho Hộ Kinh Doanh Nhỏ Lẻ tại Việt Nam.

Nhiệm vụ:
1. Trích xuất thông tin từ tin nhắn hoặc HÌNH ẢNH SỔ SÁCH/HÓA ĐƠN (OCR).
2. Thu thập: Tên hộ, Mô hình kinh doanh, Doanh thu, Chi phí, Nhu cầu vay, Thời hạn vay.
3. Trả về đúng định dạng JSON duy nhất (không bọc trong markdown ```json):
{
  "reply_to_user": "Lời nhắn phản hồi thân thiện dành cho khách hàng trên Zalo",
  "extracted_data": {
    "merchant_name": "Tên chủ hộ/tiệm",
    "business_type": "Mô hình kinh doanh",
    "revenue_monthly": 100000000,
    "expense_monthly": 60000000,
    "loan_amount": 150000000,
    "loan_term_months": 12,
    "loan_purpose": "Mục đích vay"
  },
  "next_state": "INTERVIEWING" // hoặc "COMPLETED" khi đã đủ dữ liệu
}
"""

class ChatPayload(BaseModel):
    message: Optional[str] = ""
    image: Optional[str] = None
    current_data: Optional[Dict[str, Any]] = None
    current_state: Optional[str] = "GREETING"

@app.get("/", response_class=HTMLResponse)
async def read_root():
    possible_paths = ["templates/index.html", "index.html"]
    for path in possible_paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h2>Chưa tìm thấy index.html</h2>")

@app.post("/api/chat")
async def chat_endpoint(payload: ChatPayload):
    try:
        client = get_gemini_client()
        contents = [
            f"Dữ liệu hiện tại: {json.dumps(payload.current_data or {}, ensure_ascii=False)}\nTin nhắn mới: {payload.message}"
        ]

        if payload.image:
            try:
                base64_data = payload.image.split(",", 1)[1] if "," in payload.image else payload.image
                image_bytes = base64.b64decode(base64_data)
                contents.append(types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"))
            except Exception as e:
                print("Lỗi đọc ảnh OCR:", e)

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.2,
                response_mime_type="application/json"
            )
        )

        try:
            res_json = json.loads(response.text)
        except Exception:
            res_json = {
                "reply_to_user": response.text,
                "extracted_data": payload.current_data or {},
                "next_state": payload.current_state
            }

        return JSONResponse(content=res_json)

    except Exception as e:
        return JSONResponse(
            status_code=200,
            content={
                "reply_to_user": f"FinAgent đang gặp gián đoạn kết nối: {str(e)}. Xin vui lòng gửi lại tin nhắn!",
                "extracted_data": payload.current_data or {},
                "next_state": payload.current_state
            }
        )

@app.post("/api/export-report")
async def export_report(payload: Dict[str, Any]):
    data = payload.get("extracted_data", {})
    rev = data.get("revenue_monthly") or 0
    exp = data.get("expense_monthly") or 0
    loan = data.get("loan_amount") or 0
    term = data.get("loan_term_months") or 12
    
    net = rev - exp
    monthly_pay = (loan / term) + (loan * 0.01) if term > 0 else 0
    dsr = (monthly_pay / net * 100) if net > 0 else 0
    
    status = "PHÊ DUYỆT" if dsr <= 40 and dsr > 0 else "CẦN TĂNG TÀI SẢN ĐẢM BẢO / GIẢM HẠN MỨC"

    return JSONResponse(content={
        "merchant_name": data.get("merchant_name") or "Chưa rõ",
        "business_type": data.get("business_type") or "Chưa rõ",
        "financial_summary": {
            "revenue": rev,
            "expense": exp,
            "net_profit": net,
            "loan_requested": loan,
            "estimated_monthly_payment": monthly_pay,
            "dsr_ratio": round(dsr, 1)
        },
        "approval_status": status,
        "recommendation": f"Tỷ lệ DSR đạt {round(dsr, 1)}%. Hộ kinh doanh có dòng tiền khả thi để hoàn trả khoản vay."
    })