import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { toast } from "sonner";
import {
  ArrowDownToLine,
  Building2,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Clock,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  createPayoutRequest,
  MIN_PAYOUT_AMOUNT_NGN,
  PayoutRequest,
} from "@/services/promotionSettlementService";
import { useAuth } from "@/contexts/AuthContext";

const NIGERIAN_BANKS = [
  { name: "Access Bank", code: "044" },
  { name: "Guaranty Trust Bank (GTBank)", code: "058" },
  { name: "Zenith Bank", code: "057" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "United Bank for Africa (UBA)", code: "033" },
  { name: "Kuda Microfinance Bank", code: "50211" },
  { name: "OPay (PayCom)", code: "999992" },
  { name: "PalmPay", code: "999991" },
  { name: "Moniepoint MFB", code: "50515" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "FCMB", code: "214" },
  { name: "Fidelity Bank", code: "070" },
  { name: "Sterling Bank", code: "232" },
  { name: "Union Bank of Nigeria", code: "032" },
  { name: "Wema Bank / ALAT", code: "035" },
  { name: "Taj Bank", code: "302" },
  { name: "Jaiz Bank", code: "301" },
];

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  onSuccess?: () => void;
}

export default function WithdrawDialog({
  open,
  onOpenChange,
  availableBalance,
  onSuccess,
}: WithdrawDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [amount, setAmount] = useState<string>("");
  const [bankCode, setBankCode] = useState<string>("");
  const [customBankName, setCustomBankName] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [createdPayout, setCreatedPayout] = useState<PayoutRequest | null>(null);

  const selectedBank = NIGERIAN_BANKS.find((b) => b.code === bankCode);
  const effectiveBankName = selectedBank ? selectedBank.name : customBankName.trim();

  const reset = () => {
    setStep("form");
    setAmount("");
    setBankCode("");
    setCustomBankName("");
    setAccountNumber("");
    setAccountName("");
    setLoading(false);
    setCreatedPayout(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setTimeout(reset, 250);
    }
    onOpenChange(v);
  };

  const handleProceedToConfirm = () => {
    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid withdrawal amount.");
      return;
    }
    if (numAmount < MIN_PAYOUT_AMOUNT_NGN) {
      toast.error(`Minimum withdrawal amount is ₦${MIN_PAYOUT_AMOUNT_NGN.toLocaleString()}.`);
      return;
    }
    if (numAmount > availableBalance) {
      toast.error(
        `Amount exceeds your available balance of ₦${availableBalance.toLocaleString()}.`
      );
      return;
    }
    if (!bankCode && !customBankName.trim()) {
      toast.error("Please select or enter your destination bank.");
      return;
    }
    const cleanNum = accountNumber.replace(/\D/g, "");
    if (cleanNum.length !== 10) {
      toast.error("Nigerian NUBAN account number must be exactly 10 digits.");
      return;
    }
    if (!accountName.trim() || accountName.trim().length < 3) {
      toast.error("Please enter your verified bank account holder name.");
      return;
    }
    setStep("confirm");
  };

  const handleSubmitPayout = async () => {
    const numAmount = Number(amount);
    const cleanNum = accountNumber.replace(/\D/g, "");

    setLoading(true);
    try {
      const res = await createPayoutRequest(
        {
          amount: numAmount,
          bank_name: effectiveBankName,
          bank_code: bankCode || "000",
          account_number: cleanNum,
          account_name: accountName.trim(),
        },
        user?.id
      );

      if (res.error || !res.payout) {
        toast.error(res.error || "Failed to submit payout withdrawal request.");
        setLoading(false);
        return;
      }

      setCreatedPayout(res.payout);
      setStep("success");
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      toast.success(
        `₦${numAmount.toLocaleString()} withdrawal submitted! Funds reserved safely.`
      );
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred during payout submission.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full rounded-3xl p-5 sm:p-6 space-y-4">
        {step === "form" && (
          <>
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ArrowDownToLine className="h-4 w-4" />
                </div>
                Withdraw to Bank Account
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Transfer promotion earnings or wallet balance directly to your Nigerian bank.
              </DialogDescription>
            </DialogHeader>

            <div className="p-3 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Available Balance:</span>
              <span className="font-black text-foreground text-sm">
                ₦{availableBalance.toLocaleString()}
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Amount Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">Withdrawal Amount (₦)</Label>
                  <button
                    type="button"
                    onClick={() => setAmount(String(availableBalance))}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    Withdraw All
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">
                    ₦
                  </span>
                  <Input
                    type="number"
                    min={MIN_PAYOUT_AMOUNT_NGN}
                    max={availableBalance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 10,000"
                    className="pl-8 h-11 text-base font-bold rounded-2xl border-2"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground block">
                  Minimum withdrawal: ₦{MIN_PAYOUT_AMOUNT_NGN.toLocaleString()} · No hidden fee
                </span>
              </div>

              {/* Bank Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Select Bank</Label>
                <Select value={bankCode} onValueChange={setBankCode}>
                  <SelectTrigger className="h-11 rounded-2xl text-xs font-medium">
                    <SelectValue placeholder="Choose Nigerian Bank..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {NIGERIAN_BANKS.map((b) => (
                      <SelectItem key={b.code} value={b.code} className="text-xs">
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Account Number */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Account Number (10 Digits)
                </Label>
                <Input
                  type="text"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="0123456789"
                  className="h-11 text-sm font-mono tracking-widest font-bold rounded-2xl"
                />
              </div>

              {/* Account Holder Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Account Holder Name
                </Label>
                <Input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. JOHN DOE"
                  className="h-11 text-xs font-bold rounded-2xl uppercase"
                />
              </div>
            </div>

            <Button
              onClick={handleProceedToConfirm}
              className="w-full h-11 rounded-2xl font-bold text-xs gap-1.5"
            >
              <span>Review Withdrawal Details</span>
            </Button>
          </>
        )}

        {step === "confirm" && (
          <>
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Confirm Payout Withdrawal
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Please verify your bank details before initiating fund reservation.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 rounded-2xl bg-muted/60 border border-border/80 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="text-muted-foreground">Withdrawal Amount:</span>
                <span className="font-black text-foreground text-base">
                  ₦{Number(amount).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Destination Bank:</span>
                <span className="font-bold text-foreground">{effectiveBankName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Account Number:</span>
                <span className="font-mono font-bold text-foreground tracking-wider">
                  {accountNumber}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Account Name:</span>
                <span className="font-bold text-foreground uppercase">{accountName}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/60 text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Processing Fee:</span>
                <span>₦0 (Free)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <Clock className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Funds will be reserved atomically from your available balance while the transfer is processed to your bank.
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setStep("form")}
                disabled={loading}
                className="flex-1 rounded-2xl h-11 text-xs font-bold"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmitPayout}
                disabled={loading}
                className="flex-1 rounded-2xl h-11 text-xs font-bold bg-primary gap-1.5"
              >
                {loading ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Reserving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm & Withdraw</span>
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {step === "success" && createdPayout && (
          <div className="text-center py-4 space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-foreground">Withdrawal Request Queued!</h3>
              <p className="text-xs text-muted-foreground">
                ₦{createdPayout.amount.toLocaleString()} has been reserved and queued for bank settlement.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/60 border border-border/80 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payout Reference:</span>
                <span className="font-mono font-bold text-foreground text-[11px]">
                  {createdPayout.payout_reference}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Destination:</span>
                <span className="font-bold text-foreground">
                  {createdPayout.bank_name} ({createdPayout.account_number})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                  <Clock className="h-3 w-3" /> Processing
                </span>
              </div>
            </div>

            <Button
              onClick={() => handleClose(false)}
              className="w-full h-11 rounded-2xl font-bold text-xs"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
