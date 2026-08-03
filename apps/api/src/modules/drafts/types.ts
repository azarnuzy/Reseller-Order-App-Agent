export type DraftValidationIssue = {
  code: string;
  message: string;
  field?: string;
  itemId?: string;
  productId?: string;
};
