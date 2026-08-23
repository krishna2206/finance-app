import { OperationType, TransactionFlow, WalletSource } from './models';

export interface ParsedSms {
  isMatch: boolean;
  operator: 'MVOLA' | 'AIRTEL' | 'TELMA' | 'UNKNOWN';
  flow: TransactionFlow;
  operationType: OperationType;
  wallet: WalletSource;
  destinationWallet?: WalletSource;
  amount: number;
  feeAmount: number;
  newBalance?: number;
  recipientOrSender?: string;
  referenceNumber?: string;
  rawText: string;
  date: string;
}
