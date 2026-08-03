export type InterviewState = 
  | 'GREETING' 
  | 'FINANCIALS' 
  | 'LOAN_REQ' 
  | 'CONFIRMATION' 
  | 'COMPLETED';

export interface ExtractedData {
  merchant_name: string | null;
  business_type: string | null;
  revenue_monthly: number | null;
  expense_monthly: number | null;
  loan_amount: number | null;
  loan_term_months?: number | null;
  loan_purpose?: string | null;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  image?: string;
  timestamp: string;
  extracted_data?: ExtractedData;
  next_state?: InterviewState;
}

export interface ReportData {
  report_id: string;
  generated_at: string;
  extracted_data: ExtractedData;
  net_income: number;
  estimated_installment: number;
  dsr: number; // e.g. 24.5 means 24.5%
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_flags: string[];
  credit_recommendation: string;
  max_recommended_loan: number;
}

export interface ChatResponse {
  reply_to_user: string;
  next_state: InterviewState;
  extracted_data: ExtractedData;
}
