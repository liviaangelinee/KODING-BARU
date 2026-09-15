import { useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Mail, KeyRound, Loader2 } from "lucide-react";

export default function Profil() {
  const { user, setUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);

  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [emailPwd, setEmailPwd] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  const saveName = async (e) => {
    e.preventDefault();
    setSavingName(true);
    try {
      const { data } = await api.put("/auth/profile/name", { name });
      setUser(data);
      toast.success("Nama diperbarui");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
    setSavingName(false);
  };

  const saveEmail = async (e) => {
    e.preventDefault();
    setSavingEmail(true);
    try {
      const { data } = await api.put("/auth/profile/email", { new_email: newEmail, current_password: emailPwd });
      setUser(data);
      setEmailPwd("");
      toast.success("Email diperbarui. Gunakan email baru untuk login berikutnya.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
    setSavingEmail(false);
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) return toast.error("Konfirmasi password tidak cocok");
    if (newPwd.length < 6) return toast.error("Password baru minimal 6 karakter");
    setSavingPwd(true);
    try {
      await api.put("/auth/profile/password", { current_password: curPwd, new_password: newPwd });
      setCurPwd("");
      setNewPwd("");
      setConfirmPwd("");
      toast.success("Password berhasil diperbarui");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
    setSavingPwd(false);
  };

  const labelCls = "text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="space-y-6 max-w-3xl" data-testid="profil-page">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-slate-900">Profil Saya</h1>
        <p className="text-sm text-slate-500 mt-1">Ubah nama, email, dan password akun Anda.</p>
      </div>

      <Card className="p-6 border-slate-200 shadow-none rounded-lg">
        <div className="flex items-center gap-2 mb-4 text-blue-600">
          <User className="h-4 w-4" />
          <h3 className="font-heading font-semibold text-slate-800">Nama</h3>
        </div>
        <form onSubmit={saveName} className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <Label className={labelCls}>Nama Tampilan</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" data-testid="profile-name-input" />
          </div>
          <Button type="submit" disabled={savingName} className="bg-blue-600 hover:bg-blue-700" data-testid="save-name-btn">
            {savingName && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Simpan
          </Button>
        </form>
      </Card>

      <Card className="p-6 border-slate-200 shadow-none rounded-lg">
        <div className="flex items-center gap-2 mb-4 text-blue-600">
          <Mail className="h-4 w-4" />
          <h3 className="font-heading font-semibold text-slate-800">Email</h3>
        </div>
        <form onSubmit={saveEmail} className="space-y-4">
          <div>
            <Label className={labelCls}>Email Baru</Label>
            <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1.5" data-testid="profile-email-input" required />
          </div>
          <div>
            <Label className={labelCls}>Password Saat Ini (untuk konfirmasi)</Label>
            <Input type="password" value={emailPwd} onChange={(e) => setEmailPwd(e.target.value)} className="mt-1.5" data-testid="profile-email-password" required />
          </div>
          <Button type="submit" disabled={savingEmail} className="bg-blue-600 hover:bg-blue-700" data-testid="save-email-btn">
            {savingEmail && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Ubah Email
          </Button>
        </form>
      </Card>

      <Card className="p-6 border-slate-200 shadow-none rounded-lg">
        <div className="flex items-center gap-2 mb-4 text-blue-600">
          <KeyRound className="h-4 w-4" />
          <h3 className="font-heading font-semibold text-slate-800">Ganti Password</h3>
        </div>
        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <Label className={labelCls}>Password Saat Ini</Label>
            <Input type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} className="mt-1.5" data-testid="profile-current-password" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className={labelCls}>Password Baru</Label>
              <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="mt-1.5" data-testid="profile-new-password" required />
            </div>
            <div>
              <Label className={labelCls}>Konfirmasi Password Baru</Label>
              <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="mt-1.5" data-testid="profile-confirm-password" required />
            </div>
          </div>
          <Button type="submit" disabled={savingPwd} className="bg-blue-600 hover:bg-blue-700" data-testid="save-password-btn">
            {savingPwd && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Ubah Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
