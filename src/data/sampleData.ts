// Sample business scenarios for quick testing of FinAgent
export interface SampleScenario {
  id: string;
  title: string;
  businessType: string;
  description: string;
  initialMessage: string;
  receiptImageDataUrl?: string;
  expectedData: {
    merchant_name: string;
    business_type: string;
    revenue_monthly: number;
    expense_monthly: number;
    loan_amount: number;
    loan_purpose: string;
  };
}

// Generate a clean sample receipt / handwritten ledger image data URL on canvas
export function createSampleReceiptImage(type: 'grocery_ledger' | 'clothing_invoice' | 'eatery_bill'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Paper Background (light warm beige with notebook grid lines)
  ctx.fillStyle = '#faf8f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Notebook line grid
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let y = 40; y < canvas.height; y += 24) {
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(canvas.width - 10, y);
    ctx.stroke();
  }

  // Margin line
  ctx.strokeStyle = '#fca5a5';
  ctx.beginPath();
  ctx.moveTo(50, 0);
  ctx.lineTo(50, canvas.height);
  ctx.stroke();

  // Draw Handwritten-style text
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 16px "Courier New", monospace';

  if (type === 'grocery_ledger') {
    ctx.fillText('SỔ GHI CHÉP DOANH THU - TẠP HÓA THÀNH CÔNG', 60, 35);
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText('Chủ hộ: Nguyễn Thị Mai - SĐT: 0988.123.xxx', 60, 60);
    ctx.fillText('------------------------------------------------', 60, 75);
    ctx.fillText('Tháng 07/2026:', 60, 95);
    ctx.fillText('+ Doanh thu bán lẻ nước, bánh kẹo: 78.000.000 đ', 60, 120);
    ctx.fillText('+ Doanh thu gia dụng & thẻ nạp:     42.000.000 đ', 60, 145);
    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText('=> TỔNG DOANH THU THÁNG: 120.000.000 đ', 60, 175);
    
    ctx.fillStyle = '#991b1b';
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText('CHI PHÍ VẬN HÀNH THÁNG 07:', 60, 210);
    ctx.fillText('- Tien nhap hang dai ly:           65.000.000 đ', 60, 230);
    ctx.fillText('- Tien dien, nuoc, wifi:            3.500.000 đ', 60, 250);
    ctx.fillText('- Thue mat bang:                    6.500.000 đ', 60, 270);
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText('=> TỔNG CHI PHÍ THÁNG:   75.000.000 đ', 60, 300);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'italic 12px "Courier New", monospace';
    ctx.fillText('Xác nhận Sổ ghi chép hợp lệ - Ký tên: Mai', 60, 335);
  } else if (type === 'eatery_bill') {
    ctx.fillText('NHÀ HÀNG / QUÁN ĂN BÌNH DÂN PHỐ CỔ', 60, 35);
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText('Chủ hộ: Trần Văn Hùng - Quán Phở & Cơm Tấm', 60, 60);
    ctx.fillText('------------------------------------------------', 60, 75);
    ctx.fillText('DOANH THU TRUNG BÌNH THÁNG:', 60, 100);
    ctx.fillText('- Ban tai quan (120 bat/ngay):     60.000.000 đ', 60, 125);
    ctx.fillText('- Ship ShopeeFood/GrabFood:         30.000.000 đ', 60, 150);
    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText('=> TỔNG THU NHẬP BÌNH QUÂN: 90.000.000 đ/tháng', 60, 180);

    ctx.fillStyle = '#991b1b';
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText('CHI PHÍ NGUYÊN LIỆU & NHÂN CÔNG:', 60, 215);
    ctx.fillText('- Mua thit, xuong, gao, rau:        40.000.000 đ', 60, 235);
    ctx.fillText('- Luong 2 phu quan:                 14.000.000 đ', 60, 255);
    ctx.fillText('- Mat bang + Dien nuoc:             11.000.000 đ', 60, 275);
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText('=> TỔNG CHI PHÍ BÌNH QUÂN:  65.000.000 đ/tháng', 60, 305);
  } else {
    ctx.fillText('HÓA ĐƠN NHẬP HÀNG THỜI TRANG LINH SHOP', 60, 35);
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText('Địa chỉ: Chợ Đồng Xuân, Hà Nội', 60, 60);
    ctx.fillText('------------------------------------------------', 60, 75);
    ctx.fillText('Báo cáo doanh số & Nhập hàng mùa thu:', 60, 100);
    ctx.fillText('+ Bán lẻ Livestream TikTok:       180.000.000 đ', 60, 125);
    ctx.fillText('+ Bán sỉ đại lý tỉnh:              70.000.000 đ', 60, 150);
    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText('=> TỔNG DOANH THU:         250.000.000 đ', 60, 180);

    ctx.fillStyle = '#991b1b';
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText('CHI PHÍ NHẬP HÀNG & MARKETING:', 60, 215);
    ctx.fillText('- Nhap vay, ao khoac xang:         130.000.000 đ', 60, 235);
    ctx.fillText('- Chay quang cao TikTok Ads:        20.000.000 đ', 60, 255);
    ctx.fillText('- Thue kho & NV đóng gói:           15.000.000 đ', 60, 275);
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText('=> TỔNG CHI PHÍ:           165.000.000 đ', 60, 305);
  }

  return canvas.toDataURL('image/png');
}

export const SAMPLE_SCENARIOS: SampleScenario[] = [
  {
    id: 'grocery_store',
    title: 'Tiệm Tạp Hóa Mai (Vay 80Tr)',
    businessType: 'Tạp hóa & Bách hóa',
    description: 'Doanh thu 120Tr/tháng, Chi phí 75Tr. Cần vay 80 triệu nhập hàng Tết.',
    initialMessage: 'Chào FinAgent, tôi là Nguyễn Thị Mai, chủ tiệm Tạp hóa Thành Công ở Bình Dương. Tôi gửi sổ ghi chép thu chi tháng rồi cho em xem thử nhé!',
    expectedData: {
      merchant_name: 'Nguyễn Thị Mai (Tạp hóa Thành Công)',
      business_type: 'Tạp hóa & Bách hóa',
      revenue_monthly: 120000000,
      expense_monthly: 75000000,
      loan_amount: 80000000,
      loan_purpose: 'Nhập buôn bánh kẹo & đồ uống chuẩn bị hàng Tết'
    }
  },
  {
    id: 'eatery_shop',
    title: 'Quán Phở Hùng (Vay 50Tr)',
    businessType: 'Quán ăn bình dân',
    description: 'Doanh thu 90Tr/tháng, Chi phí 65Tr. Cần vay 50 triệu sửa quán.',
    initialMessage: 'Chào em, anh Hùng chủ Quán Phở & Cơm Tấm Phố Cổ. Anh đang tính vay khoảng 50 triệu để sửa lại mặt bằng bếp.',
    expectedData: {
      merchant_name: 'Trần Văn Hùng (Quán Phở Phố Cổ)',
      business_type: 'Quán ăn bình dân',
      revenue_monthly: 90000000,
      expense_monthly: 65000000,
      loan_amount: 50000000,
      loan_purpose: 'Sửa chữa và mở rộng khu vực bếp nấu'
    }
  },
  {
    id: 'fashion_shop',
    title: 'Linh Shop Livestream (Vay 200Tr)',
    businessType: 'Thời trang & Livestream',
    description: 'Doanh thu 250Tr/tháng, Chi phí 165Tr. Cần vay 200 triệu mở rộng kho.',
    initialMessage: 'Em chào FinAgent, em là Linh chủ Linh Shop quần áo online. Shop em bán TikTok và sỉ tỉnh, em gửi ảnh hóa đơn nhập hàng tháng vừa rồi nè.',
    expectedData: {
      merchant_name: 'Linh Shop Thời Trang',
      business_type: 'Thời trang & Livestream',
      revenue_monthly: 250000000,
      expense_monthly: 165000000,
      loan_amount: 200000000,
      loan_purpose: 'Mở rộng kho và nhập lô áo khoác mùa đông'
    }
  }
];
