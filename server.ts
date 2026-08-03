import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 receipt images
app.use(express.json({ limit: "50mb" }));

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. Requests requiring AI will fail until configured.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// System Prompt for FinAgent Vietnamese Credit Officer
const SYSTEM_PROMPT = `
Bạn là "FinAgent" - Chuyên viên Thẩm định Tín dụng AI chuyên nghiệp, thân thiện và am hiểu tâm lý hộ kinh doanh nhỏ lẻ (tiệm tạp hóa, quán ăn, xưởng may, cửa hàng thời trang...).

NHIỆM VỤ CỦA BẠN:
Phỏng vấn chủ hộ kinh doanh để thu thập thông tin tài chính, phân tích ảnh hóa đơn/sổ ghi chép thu chi (nếu có), đánh giá khả năng trả nợ và chuẩn bị dữ liệu cho Tờ Trình Thẩm Định Tín Dụng.

QUY TẮC BẮT BUỘC:
1. Luôn nói tiếng Việt lịch sự, tự nhiên, gần gũi như trò chuyện Zalo.
2. CHỈ HỎI 1 CÂU TẠI MỘT THỜI ĐIỂM. Tránh đặt nhiều câu hỏi dồn dập khiến khách hàng bị bối rối.
3. Quy trình trạng thái (next_state):
   - GREETING: Chào hỏi, giới thiệu bản thân và hỏi tên/tên hộ kinh doanh, lĩnh vực buôn bán.
   - FINANCIALS: Hỏi về Doanh thu trung bình hàng tháng và Chi phí vận hành (tiền nhập hàng, mặt bằng, điện nước...). Nếu khách gửi ảnh sổ sách/hóa đơn, hãy soi và bóc tách con số ngay!
   - LOAN_REQ: Hỏi về Số tiền cần vay, thời hạn mong muốn và Mục đích sử dụng vốn.
   - CONFIRMATION: Tóm tắt lại toàn bộ thông tin đã thu thập được để khách hàng xác nhận.
   - COMPLETED: Khách hàng đã xác nhận thông tin đúng, hoàn tất phỏng vấn để xuất Tờ trình thẩm định.

4. XỬ LÝ DỮ LIỆU TÀI CHÍNH (extracted_data):
   - Luôn tổng hợp và cập nhật dữ liệu tài chính tích lũy qua từng tin nhắn.
   - Chuyển đổi các từ ngữ dân dã sang số tiền VND chính xác:
     * "100 triệu", "100tr", "100tr/tháng" -> 100000000
     * "50 củ", "50 triệu" -> 50000000
     * "hơn 200 triệu" -> 200000000
     * "tiền lời 30 triệu" -> tính toán doanh thu/chi phí tương ứng
   - Nếu thông tin chưa được đề cập, giữ nguyên giá trị đã có hoặc gán null.

Trả về duy nhất dữ liệu theo định dạng JSON chuẩn.
`;

// API 1: /api/chat - Conversational AI Interview
app.post("/api/chat", async (req, res) => {
  try {
    const { message, image, history = [], current_data = {}, current_state = "GREETING" } = req.body;

    const ai = getGeminiClient();

    // Prepare contents array
    const parts: any[] = [];
    
    // Context description for Gemini
    let contextPrompt = `Trạng thái hiện tại: ${current_state}\nDữ liệu tài chính đã thu thập đến nay:\n${JSON.stringify(current_data, null, 2)}\n\n`;
    contextPrompt += `Tin nhắn mới từ người dùng: "${message || '(Chỉ gửi hình ảnh hóa đơn/sổ sách)'}"`;

    parts.push({ text: contextPrompt });

    // Attach image if provided (base64)
    if (image && typeof image === "string") {
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    // Call Gemini 3.6 Flash
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply_to_user: {
              type: Type.STRING,
              description: "Câu trả lời gửi cho khách hàng bằng tiếng Việt gần gũi, hỏi đúng 1 câu."
            },
            next_state: {
              type: Type.STRING,
              description: "Một trong các giá trị: GREETING, FINANCIALS, LOAN_REQ, CONFIRMATION, COMPLETED"
            },
            extracted_data: {
              type: Type.OBJECT,
              properties: {
                merchant_name: { type: Type.STRING, description: "Tên chủ hộ hoặc tên cửa hàng" },
                business_type: { type: Type.STRING, description: "Mô hình kinh doanh (Tạp hóa, Quán ăn, Thời trang...)" },
                revenue_monthly: { type: Type.NUMBER, description: "Doanh thu trung bình hàng tháng (VND)" },
                expense_monthly: { type: Type.NUMBER, description: "Chi phí trung bình hàng tháng (VND)" },
                loan_amount: { type: Type.NUMBER, description: "Số tiền cần vay (VND)" },
                loan_term_months: { type: Type.NUMBER, description: "Thời hạn vay (tháng)" },
                loan_purpose: { type: Type.STRING, description: "Mục đích sử dụng vốn vay" }
              }
            }
          },
          required: ["reply_to_user", "next_state", "extracted_data"]
        }
      }
    });

    const responseText = response.text || "{}";
    let parsedJson;
    try {
      parsedJson = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse JSON response from Gemini:", responseText);
      parsedJson = {
        reply_to_user: "Dạ em đã ghi nhận thông tin. Anh/chị có thể chia sẻ thêm về doanh thu hàng tháng của mình không ạ?",
        next_state: current_state,
        extracted_data: current_data
      };
    }

    // Merge new extracted_data with current_data to preserve cumulative state
    const mergedData = {
      merchant_name: parsedJson.extracted_data?.merchant_name || current_data.merchant_name || null,
      business_type: parsedJson.extracted_data?.business_type || current_data.business_type || null,
      revenue_monthly: parsedJson.extracted_data?.revenue_monthly ?? current_data.revenue_monthly ?? null,
      expense_monthly: parsedJson.extracted_data?.expense_monthly ?? current_data.expense_monthly ?? null,
      loan_amount: parsedJson.extracted_data?.loan_amount ?? current_data.loan_amount ?? null,
      loan_term_months: parsedJson.extracted_data?.loan_term_months ?? current_data.loan_term_months ?? 12,
      loan_purpose: parsedJson.extracted_data?.loan_purpose || current_data.loan_purpose || null
    };

    return res.json({
      reply_to_user: parsedJson.reply_to_user,
      next_state: parsedJson.next_state || current_state,
      extracted_data: mergedData
    });

  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    return res.status(500).json({
      error: error?.message || "Internal server error during chat analysis."
    });
  }
});

// Helper for formatting Vietnamese currency
function formatVND(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "Chưa xác định";
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// API 2: /api/export-report - Financial Risk Calculations & HTML Appraisal Report Generation
app.post("/api/export-report", (req, res) => {
  try {
    const { extracted_data } = req.body;
    
    if (!extracted_data) {
      return res.status(400).json({ error: "extracted_data is required" });
    }

    const revenue = Number(extracted_data.revenue_monthly) || 0;
    const expense = Number(extracted_data.expense_monthly) || 0;
    const loanAmount = Number(extracted_data.loan_amount) || 0;
    const termMonths = Number(extracted_data.loan_term_months) || 12;

    // Financial Calculations
    const netIncome = revenue - expense;
    
    // Estimated Monthly Installment (Principal + Interest)
    // Interest rate assumed ~ 14% p.a. (1.167% / month) for micro-business lending
    const monthlyInterestRate = 0.14 / 12;
    const principalPerMonth = loanAmount / (termMonths || 12);
    const estimatedInterestPerMonth = loanAmount * monthlyInterestRate;
    const estimatedInstallment = principalPerMonth + estimatedInterestPerMonth;

    // Debt Service Ratio (DSR) = (Estimated Monthly Installment / Net Income) * 100
    let dsr = 0;
    if (netIncome > 0) {
      dsr = (estimatedInstallment / netIncome) * 100;
    } else if (estimatedInstallment > 0) {
      dsr = 999; // Infinite / Critical risk
    }

    // Risk Flags & Classification
    const riskFlags: string[] = [];
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let creditRecommendation = "ĐỦ ĐIỀU KIỆN PHÊ DUYỆT (KHOẢN VAY AN TOÀN)";

    if (expense >= revenue) {
      riskFlags.push("🚨 Thâm hụt ngân sách: Chi phí hàng tháng vượt quá hoặc bằng doanh thu (Lợi nhuận ròng ≤ 0).");
      riskLevel = 'CRITICAL';
      creditRecommendation = "TỪ CHỐI CHO VAY (Rủi ro dòng tiền không đủ trả nợ)";
    } else if (dsr > 40) {
      riskFlags.push(`⚠️ Cảnh báo DSR vượt mức an toàn: Tỷ lệ trả nợ/Thu nhập ròng DSR = ${dsr.toFixed(1)}% (Ngoại hạch cho phép ≤ 40%).`);
      riskLevel = 'HIGH';
      creditRecommendation = "XEM XÉT GIẢM HẠ MỨC CẤP TÍN DỤNG HOẶC YÊU CẦU TÀI SẢN BẢO ĐẢM";
    } else if (dsr > 30) {
      riskFlags.push(`⚠️ DSR nằm ở mức trung bình (${dsr.toFixed(1)}%): Cần kiểm soát nguồn thu nhập phụ.`);
      riskLevel = 'MEDIUM';
      creditRecommendation = "CHẤP THUẬN KÈM ĐIỀU KIỆN (Kiểm soát dòng tiền qua tài khoản)";
    } else {
      riskFlags.push("✅ Chỉ số tài chính đạt chuẩn. Tỷ lệ DSR trong ngưỡng an toàn dưới 30%.");
    }

    if (loanAmount > netIncome * 12 * 0.8) {
      riskFlags.push(`⚠️ Số tiền đề nghị vay (${formatVND(loanAmount)}) khá lớn so với thu nhập ròng 1 năm (${formatVND(netIncome * 12)}).`);
      if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
    }

    // Max recommended loan calculation based on 35% maximum DSR limit
    const maxMonthlyInstallmentCapacity = netIncome * 0.35;
    const maxRecommendedLoan = Math.max(0, Math.floor(maxMonthlyInstallmentCapacity * termMonths / (1 + monthlyInterestRate * termMonths)));

    const reportId = `TTr-FINAGENT-${Date.now().toString().slice(-6)}`;
    const generatedAt = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    // Build formal HTML Report Document
    const htmlReport = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Tờ Trình Thẩm Định Tín Dụng - ${extracted_data.merchant_name || 'Hộ Kinh Doanh'}</title>
  <style>
    @media print {
      body { font-size: 11pt; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1e293b;
      line-height: 1.6;
      background-color: #f8fafc;
      margin: 0;
      padding: 24px;
    }
    .report-container {
      max-width: 850px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      border: 1px solid #e2e8f0;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
    }
    .header-title {
      font-size: 20px;
      font-weight: 700;
      color: #0369a1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-sub {
      font-size: 13px;
      color: #64748b;
    }
    .badge-risk {
      display: inline-block;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .risk-LOW { background-color: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .risk-MEDIUM { background-color: #fef9c3; color: #a16207; border: 1px solid #fde047; }
    .risk-HIGH { background-color: #ffedd5; color: #c2410c; border: 1px solid #fdba74; }
    .risk-CRITICAL { background-color: #ffe4e6; color: #be123c; border: 1px solid #fda4af; }

    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      background-color: #f1f5f9;
      padding: 8px 12px;
      border-left: 4px solid #0284c7;
      margin-top: 24px;
      margin-bottom: 12px;
      border-radius: 0 4px 4px 0;
      text-transform: uppercase;
    }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #e2e8f0;
      padding: 10px 14px;
      font-size: 13.5px;
    }
    table.data-table th {
      background-color: #f8fafc;
      color: #475569;
      font-weight: 600;
      text-align: left;
    }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .text-primary { color: #0284c7; }
    .text-danger { color: #e11d48; }

    .risk-box {
      background-color: ${riskLevel === 'CRITICAL' ? '#fff1f2' : riskLevel === 'HIGH' ? '#fff7ed' : '#f0fdf4'};
      border: 1px solid ${riskLevel === 'CRITICAL' ? '#fecdd3' : riskLevel === 'HIGH' ? '#ffedd5' : '#bbf7d0'};
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .risk-box ul {
      margin: 8px 0 0 0;
      padding-left: 20px;
    }

    .recommendation-box {
      background-color: #f0f9ff;
      border: 1.5px dashed #0284c7;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
      margin-top: 20px;
    }
    .recommendation-text {
      font-size: 16px;
      font-weight: 800;
      color: #0369a1;
      margin-top: 4px;
    }

    .signature-grid {
      display: table;
      width: 100%;
      margin-top: 40px;
    }
    .signature-col {
      display: table-cell;
      width: 50%;
      text-align: center;
      vertical-align: top;
      font-size: 13px;
    }
  </style>
</head>
<body>

  <div class="report-container">
    <table class="header-table">
      <tr>
        <td>
          <div class="header-title">TỜ TRÌNH THẨM ĐỊNH TÍN DỤNG</div>
          <div class="header-sub">HỆ THỐNG TRÍ TUỆ NHÂN TẠO FINAGENT - HỘ KINH DOANH CÁ THỂ</div>
        </td>
        <td class="text-right">
          <div class="badge-risk risk-${riskLevel}">RỦI RO: ${riskLevel}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Mã số: <strong>${reportId}</strong></div>
          <div style="font-size: 11px; color: #94a3b8;">Thời gian: ${generatedAt}</div>
        </td>
      </tr>
    </table>

    <div class="section-title">I. THÔNG TIN KHÁCH HÀNG & HỘ KINH DOANH</div>
    <table class="data-table">
      <tr>
        <th width="35%">Tên Khách hàng / Chủ hộ:</th>
        <td width="65%" class="font-bold">${extracted_data.merchant_name || 'Chưa cập nhật'}</td>
      </tr>
      <tr>
        <th>Mô hình / Ngành nghề kinh doanh:</th>
        <td>${extracted_data.business_type || 'Chưa cập nhật'}</td>
      </tr>
      <tr>
        <th>Mục đích sử dụng vốn vay:</th>
        <td>${extracted_data.loan_purpose || 'Bổ sung vốn lưu động / Nhập hàng kinh doanh'}</td>
      </tr>
      <tr>
        <th>Thời hạn vay đề xuất:</th>
        <td>${termMonths} tháng</td>
      </tr>
    </table>

    <div class="section-title">II. BẢNG BÓC TÁCH & KẾT QUẢ TÀI CHÍNH (HÀNG THÁNG)</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Chỉ số Tài chính</th>
          <th class="text-right">Giá trị (VND)</th>
          <th>Đánh giá Thẩm định</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Doanh thu bình quân / tháng (A)</td>
          <td class="text-right font-bold text-primary">${formatVND(revenue)}</td>
          <td>Xác minh qua phỏng vấn & chứng từ sổ sách</td>
        </tr>
        <tr>
          <td>Chi phí hoạt động bình quân / tháng (B)</td>
          <td class="text-right font-bold text-danger">${formatVND(expense)}</td>
          <td>Bao gồm tiền nhập hàng, điện nước, mặt bằng...</td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td class="font-bold">LỢI NHUẬN RÒNG BÌNH QUÂN / THÁNG (C = A - B)</td>
          <td class="text-right font-bold ${netIncome > 0 ? 'text-primary' : 'text-danger'}" style="font-size: 15px;">
            ${formatVND(netIncome)}
          </td>
          <td class="font-bold">${netIncome > 0 ? 'Tích cực (Thặng dư dòng tiền)' : '🚨 Thâm hụt tài chính'}</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">III. ĐÁNH GIÁ NĂNG LỰC TRẢ NỢ & CHỈ SỐ DSR</div>
    <table class="data-table">
      <tr>
        <th width="50%">Số tiền vay đề nghị:</th>
        <td class="font-bold text-primary" style="font-size: 15px;">${formatVND(loanAmount)}</td>
      </tr>
      <tr>
        <th>Nghĩa vụ trả nợ ước tính hàng tháng (Gốc + Lãi ~14%/năm):</th>
        <td class="font-bold text-danger">${formatVND(estimatedInstallment)} / tháng</td>
      </tr>
      <tr>
        <th>Tỷ lệ Trả nợ / Thu nhập ròng (DSR = Nghĩa vụ trả nợ / Lợi nhuận ròng):</th>
        <td class="font-bold" style="font-size: 16px; color: ${dsr > 40 ? '#e11d48' : '#0284c7'};">
          ${dsr > 500 ? 'RẤT CAO (>100%)' : dsr.toFixed(1) + '%'}
          <span style="font-size: 12px; font-weight: normal; color: #64748b; margin-left: 8px;">(Tiêu chuẩn an toàn: ≤ 40%)</span>
        </td>
      </tr>
      <tr>
        <th>Hạn mức vay đề xuất tối đa (DSR 35%):</th>
        <td class="font-bold">${formatVND(maxRecommendedLoan)}</td>
      </tr>
    </table>

    <div class="section-title">IV. ĐÁNH GIÁ RỦI RO & BẢO HIỂM TÍN DỤNG</div>
    <div class="risk-box">
      <strong style="color: #0f172a;">Các dấu hiệu cảnh báo & Yếu tố rủi ro:</strong>
      <ul>
        ${riskFlags.map(flag => `<li style="margin-bottom: 4px;">${flag}</li>`).join('')}
      </ul>
    </div>

    <div class="recommendation-box">
      <div style="font-size: 12px; color: #64748b; font-weight: 600;">ĐỀ XUẤT CỦA TRÍ TUỆ NHÂN TẠO FINAGENT:</div>
      <div class="recommendation-text">${creditRecommendation}</div>
    </div>

    <div class="signature-grid">
      <div class="signature-col">
        <strong>CHUYÊN VIÊN THẨM ĐỊNH AI</strong><br>
        <span style="font-size: 11px; color: #94a3b8;">(Ký & ghi rõ họ tên)</span><br><br><br>
        <strong style="color: #0284c7;">FinAgent Core v2.5</strong>
      </div>
      <div class="signature-col">
        <strong>LÃNH ĐẠO PHÊ DUYỆT TÍN DỤNG</strong><br>
        <span style="font-size: 11px; color: #94a3b8;">(Ký & ghi rõ họ tên)</span><br><br><br>
        ___________________________
      </div>
    </div>
  </div>

</body>
</html>
    `;

    return res.json({
      report_id: reportId,
      generated_at: generatedAt,
      extracted_data,
      net_income: netIncome,
      estimated_installment: Math.round(estimatedInstallment),
      dsr: Number(dsr.toFixed(1)),
      risk_level: riskLevel,
      risk_flags: riskFlags,
      credit_recommendation: creditRecommendation,
      max_recommended_loan: maxRecommendedLoan,
      html_report: htmlReport
    });

  } catch (error: any) {
    console.error("Error in /api/export-report:", error);
    return res.status(500).json({ error: error?.message || "Failed to generate report" });
  }
});

// Serve frontend in development or production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FinAgent server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
