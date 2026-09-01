import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Clock,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useAuth } from "@/contexts/AuthContext";
import {
  PromoterBankAccount,
  getPromoterBankAccounts,
  requestPromoterWithdrawal,
  maskAccountNumber,
} from "@/services/promoterPayoutService";
import {
  PayoutRequest,
  MIN_PAYOUT_AMOUNT_NGN,
} from "@/services/promotionSettlementService";
import BankDetailsForm from "./BankDetailsForm";

interface PayoutRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  onSuccess?: (payout: PayoutRequest) => void;
}

export default function PayoutRequestModal({
  open,
  onOpenChange,
  availableBalance,
  onSuccess,
}: PayoutRequestModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [amountStr, setAmountStr] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [bankAccounts, setBankAccounts] = useState<PromoterBankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(false);
  const [addBankModalOpen, setAddBankModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [createdPayout, setCreatedPayout] = useState<PayoutRequest | null>(null);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);

  // Load bank accounts when modal opens
  const loadBankAccounts = async () => {
    if (!user) return;
    setLoadingAccounts(true);
    try {
      const { accounts } = await getPromoterBankAccounts(user.id);
      setBankAccounts(accounts);
      // Auto-select default account or first account
      const defaultAcc = accounts.find((a) => a.is_default) || accounts[0];
      if (defaultAcc && !selectedAccountId) {
        setSelectedAccountId(defaultAcc.id);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    if (open && user) {
      loadBankAccounts();
    }
  }, [open, user]);

  const selectedAccount = useMemo(() => {
    return bankAccounts.find((a) => a.id === selectedAccountId);
  }, [bankAccounts, selectedAccountId]);

  const numericAmount = Number(amountStr) || 0;
  const isBelowMinimum = numericAmount < MIN_PAYOUT_AMOUNT_NGN && numericAmount > 0;
  const isOverBalance = numericAmount > availableBalance;
  const remainingBalance = Math.max(0, Math.round((availableBalance - numericAmount) * 100) / 100);

  const isFormValid =
    numericAmount >= MIN_PAYOUT_AMOUNT_NGN &&
    numericAmount <= availableBalance &&
    !!selectedAccount &&
    selectedAccount.is_verified;

  const resetForm = () => {
    setStep("form");
    setAmountStr("");
    setSubmitting(false);
    setCreatedPayout(null);
    setCopiedRef(false);
  };

  const handleQuickAmount = (val: number) => {
    const target = Math.min(val, availableBalance);
    setAmountStr(String(target));
  };

  const handleSetMax = () => {
    setAmountStr(String(Math.floor(availableBalance)));
  };

  const handleProceedToConfirm = () => {
    if (!isFormValid) {
      if (numericAmount < MIN_PAYOUT_AMOUNT_NGN) {
        toast.error(`Minimum withdrawal is ₦${MIN_PAYOUT_AMOUNT_NGN.toLocaleString()}`);
      } else if (isOverBalance) {
        toast.error("Withdrawal amount cannot exceed available balance");
      } else if (!selectedAccount) {
        toast.error("Please select a verified bank settlement account");
      }
      return;
    }
    setStep("confirm");
  };

  const handleExecuteWithdrawal = async () => {
    if (!user || !selectedAccount || !isFormValid) return;

    setSubmitting(true);
    try {
      const idempotencyKey = `payout_ui_${user.id}_${numericAmount}_${Date.now()}`;
      const { payout, error } = await requestPromoterWithdrawal(
        {
          amount: numericAmount,
          bankAccountId: selectedAccount.id,
          idempotencyKey,
        },
        user.id
      );

      if (error || !payout) {
        toast.error(error || "Withdrawal request failed. Please retry.");
        setStep("form");
        return;
      }

      setCreatedPayout(payout);
      setStep("success");
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success("Payout withdrawal request submitted successfully!");
      if (onSuccess) {
        onSuccess(payout);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process withdrawal request.");
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    toast.success("Payout reference copied to clipboard");
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) resetForm();
          onOpenChange(v);
        }}
      >
        <DialogContent className="sm:max-w-lg bg-card text-card-foreground border-border shadow-2xl">
          {step === "form" && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold">Request Earnings Payout</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Withdraw cleared promotion earnings directly to your verified Nigerian bank account.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Available Balance Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                      Available Balance
                    </p>
                    <p className="text-2xl font-black tracking-tight mt-0.5">
                      ₦{availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSetMax}
                    disabled={availableBalance < MIN_PAYOUT_AMOUNT_NGN}
                    className="text-xs font-semibold h-8 border-primary/30 text-primary hover:bg-primary hover:text-white"
                  >
                    Withdraw All
                  </Button>
                </div>

                {/* Destination Bank Account */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bank-account-select" className="text-sm font-semibold">
                      Destination Bank Account <span className="text-destructive">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddBankModalOpen(true)}
                      className="h-7 text-xs font-semibold text-primary gap-1 px-2 hover:bg-primary/10"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add New Bank
                    </Button>
                  </div>

                  {bankAccounts.length === 0 && !loadingAccounts ? (
                    <div className="p-3.5 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-2">
                      <p className="text-xs text-muted-foreground">
                        No verified bank account on file.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setAddBankModalOpen(true)}
                        className="text-xs font-semibold gap-1.5"
                      >
                        <Building2 className="w-4 h-4" />
                        Add Verified Bank Account
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={selectedAccountId}
                      onValueChange={setSelectedAccountId}
                      disabled={loadingAccounts}
                    >
                      <SelectTrigger id="bank-account-select" className="h-12 text-left">
                        <SelectValue placeholder="Select bank settlement account" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {bankAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            <div className="flex items-center gap-2 py-0.5">
                              <Building2 className="w-4 h-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <span className="font-semibold text-xs sm:text-sm">
                                  {acc.bank_name}
                                </span>
                                <span className="text-xs text-muted-foreground ml-2 font-mono">
                                  ({maskAccountNumber(acc.account_number)})
                                </span>
                                <span className="text-xs font-medium text-muted-foreground block truncate">
                                  {acc.account_name}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="withdrawal-amount" className="text-sm font-semibold">
                      Withdrawal Amount (₦) <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      Min: ₦{MIN_PAYOUT_AMOUNT_NGN.toLocaleString()}
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-base">
                      ₦
                    </span>
                    <Input
                      id="withdrawal-amount"
                      type="number"
                      min={MIN_PAYOUT_AMOUNT_NGN}
                      max={availableBalance}
                      step={100}
                      placeholder="0.00"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      className="h-12 pl-8 font-bold text-lg tracking-wide"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[5000, 10000, 20000, 50000].map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAmount(preset)}
                        disabled={preset > availableBalance}
                        className="text-xs h-7 px-2.5 font-medium rounded-lg"
                      >
                        ₦{preset.toLocaleString()}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSetMax}
                      disabled={availableBalance < MIN_PAYOUT_AMOUNT_NGN}
                      className="text-xs h-7 px-2.5 font-medium rounded-lg text-primary"
                    >
                      Max
                    </Button>
                  </div>
                </div>

                {/* Realtime Balance Impact Preview */}
                {numericAmount > 0 && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Requested Payout:</span>
                      <span className="font-bold">₦{numericAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remaining Balance:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        ₦{remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Validation Warnings */}
                {isBelowMinimum && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Minimum withdrawal amount is ₦{MIN_PAYOUT_AMOUNT_NGN.toLocaleString()}.</span>
                  </div>
                )}

                {isOverBalance && (
                  <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Amount exceeds your available balance of ₦{availableBalance.toLocaleString()}.</span>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    onOpenChange(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleProceedToConfirm}
                  disabled={!isFormValid}
                  className="gap-2 bg-primary font-semibold"
                >
                  Review Withdrawal
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </DialogFooter>
            </>
          )}

          {/* STEP 2: REVIEW & CONFIRM */}
          {step === "confirm" && selectedAccount && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold">Confirm Payout Transfer</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Please confirm destination account details before reserving withdrawal funds.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-3">
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-medium text-muted-foreground">Withdrawal Amount</span>
                    <span className="text-xl font-black text-primary">
                      ₦{numericAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank Name:</span>
                      <span className="font-bold">{selectedAccount.bank_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Number:</span>
                      <span className="font-mono font-bold">
                        {maskAccountNumber(selectedAccount.account_number)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Name:</span>
                      <span className="font-bold text-right">{selectedAccount.account_name}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border/50">
                      <span className="text-muted-foreground">Remaining Balance:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        ₦{remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-primary">
                    <Clock className="w-4 h-4" />
                    <span>Instant Reservation & Processing</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Upon confirmation, ₦{numericAmount.toLocaleString()} will be reserved from your available balance. Payouts are reviewed and disbursed directly to your Nigerian bank.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("form")}
                  disabled={submitting}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteWithdrawal}
                  disabled={submitting}
                  className="gap-2 bg-primary font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Reserving Funds...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm & Submit Payout
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* STEP 3: SUCCESS CELEBRATION */}
          {step === "success" && createdPayout && (
            <>
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500 animate-in zoom-in-50 duration-300">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tight">
                    Payout Request Submitted!
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    ₦{createdPayout.amount.toLocaleString()} has been reserved and queued for bank disbursement.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/40 border border-border max-w-sm mx-auto space-y-2 text-xs text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Reference Code:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyReference(createdPayout.payout_reference)}
                      className="font-mono font-bold text-primary flex items-center gap-1 hover:underline"
                    >
                      {createdPayout.payout_reference}
                      {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Destination Bank:</span>
                    <span className="font-bold">{createdPayout.bank_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account:</span>
                    <span className="font-mono font-bold">
                      {maskAccountNumber(createdPayout.account_number)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase bg-amber-500/10 text-amber-600 border-amber-500/30">
                      Requested / In Review
                    </Badge>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => {
                    resetForm();
                    onOpenChange(false);
                  }}
                  className="w-full font-semibold"
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Embedded Bank Details Registration Modal */}
      <BankDetailsForm
        open={addBankModalOpen}
        onOpenChange={setAddBankModalOpen}
        onSuccess={(newAcc) => {
          loadBankAccounts();
          setSelectedAccountId(newAcc.id);
        }}
      />
    </>
  );
}
