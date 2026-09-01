import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  NIGERIAN_BANKS,
  verifyNigerianNuban,
  savePromoterBankAccount,
  PromoterBankAccount,
  maskAccountNumber,
} from "@/services/promoterPayoutService";
import { useAuth } from "@/contexts/AuthContext";

interface BankDetailsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (account: PromoterBankAccount) => void;
  defaultIsDefault?: boolean;
}

export default function BankDetailsForm({
  open,
  onOpenChange,
  onSuccess,
  defaultIsDefault = false,
}: BankDetailsFormProps) {
  const { user } = useAuth();
  const [bankCode, setBankCode] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [isDefault, setIsDefault] = useState<boolean>(defaultIsDefault);

  const [verifying, setVerifying] = useState<boolean>(false);
  const [verified, setVerified] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const selectedBank = NIGERIAN_BANKS.find((b) => b.code === bankCode);

  const resetForm = () => {
    setBankCode("");
    setAccountNumber("");
    setAccountName("");
    setIsDefault(defaultIsDefault);
    setVerifying(false);
    setVerified(false);
    setVerificationError(null);
    setSaving(false);
  };

  const handleAccountNumChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 10);
    setAccountNumber(clean);
    setVerified(false);
    setAccountName("");
    setVerificationError(null);

    // Auto-verify when 10 digits are filled and bank is selected
    if (clean.length === 10 && bankCode) {
      triggerVerification(clean, bankCode);
    }
  };

  const handleBankChange = (code: string) => {
    setBankCode(code);
    setVerified(false);
    setAccountName("");
    setVerificationError(null);

    if (accountNumber.length === 10) {
      triggerVerification(accountNumber, code);
    }
  };

  const triggerVerification = async (accNum: string, code: string) => {
    if (!accNum || accNum.length !== 10 || !code) return;

    setVerifying(true);
    setVerificationError(null);

    try {
      const result = await verifyNigerianNuban(accNum, code);
      if (result.valid && result.accountName) {
        setAccountName(result.accountName);
        setVerified(true);
        setVerificationError(null);
        toast.success(`Account verified: ${result.accountName}`);
      } else {
        setVerified(false);
        setAccountName("");
        setVerificationError(result.error || "Account verification failed. Please verify bank and number.");
      }
    } catch {
      setVerified(false);
      setVerificationError("Could not verify account at this time. Please check details.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Please log in to save bank details.");
      return;
    }

    if (!selectedBank) {
      toast.error("Please select your bank.");
      return;
    }

    if (accountNumber.length !== 10) {
      toast.error("Account number must be exactly 10 digits.");
      return;
    }

    if (!verified || !accountName) {
      toast.error("Please verify your account details before saving.");
      return;
    }

    setSaving(true);
    try {
      const { account, error } = await savePromoterBankAccount(
        {
          bank_name: selectedBank.name,
          bank_code: selectedBank.code,
          account_number: accountNumber,
          account_name: accountName,
          is_default: isDefault,
        },
        user.id
      );

      if (error || !account) {
        toast.error(error || "Failed to save bank account.");
        return;
      }

      toast.success("Bank account saved and verified successfully!");
      resetForm();
      onOpenChange(false);
      if (onSuccess) {
        onSuccess(account);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save bank details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Add Bank Account</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Register a verified Nigerian NUBAN bank account for receiving promotion earnings.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Bank Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="bank-select" className="text-sm font-semibold">
              Select Bank <span className="text-destructive">*</span>
            </Label>
            <Select value={bankCode} onValueChange={handleBankChange}>
              <SelectTrigger id="bank-select" className="h-11">
                <SelectValue placeholder="Choose a commercial bank or fintech" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {NIGERIAN_BANKS.map((b) => (
                  <SelectItem key={b.code} value={b.code}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account Number */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="acc-number" className="text-sm font-semibold">
                Account Number (NUBAN) <span className="text-destructive">*</span>
              </Label>
              <span className="text-xs text-muted-foreground font-mono">
                {accountNumber.length}/10 digits
              </span>
            </div>
            <div className="relative">
              <Input
                id="acc-number"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="e.g. 0123456789"
                value={accountNumber}
                onChange={(e) => handleAccountNumChange(e.target.value)}
                className="h-11 font-mono tracking-wider pr-10 text-base"
              />
              {verifying && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}
              {verified && !verifying && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              )}
            </div>
          </div>

          {/* Manual Verify Button (if not auto-triggered) */}
          {accountNumber.length === 10 && bankCode && !verified && !verifying && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => triggerVerification(accountNumber, bankCode)}
              className="w-full text-xs font-semibold gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-primary" />
              Verify Bank Account Name
            </Button>
          )}

          {/* Verification Result Display */}
          {verified && accountName && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                    Verified Account Name:
                  </p>
                  <p className="text-sm font-bold tracking-wide break-words mt-0.5">
                    {accountName}
                  </p>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                    {selectedBank?.name} • {maskAccountNumber(accountNumber)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Verification Error */}
          {verificationError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{verificationError}</span>
            </div>
          )}

          {/* Default Account Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="default-switch" className="text-sm font-semibold cursor-pointer">
                Set as Default Payout Account
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatic destination for one-click earnings withdrawals.
              </p>
            </div>
            <Switch
              id="default-switch"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/20 p-2.5 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>Bank account data is encrypted and only used for legitimate payout settlements.</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!verified || saving || verifying}
            className="gap-2 bg-primary font-semibold"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Account...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Save & Verify Bank
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
