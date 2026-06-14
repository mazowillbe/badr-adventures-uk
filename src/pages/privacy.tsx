import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, User, Trash2, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/site-shell";

export default function PrivacyPage() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/gdpr/export", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `badr-adventures-data-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data has been exported.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Are you sure? This will permanently delete your account and all associated data. This cannot be undone.",
    );
    if (!confirmed) return;
    const doubleConfirm = window.confirm(
      "Final confirmation: type YES if you understand this is irreversible.",
    );
    if (!doubleConfirm) return;
    setDeleting(true);
    try {
      await api("/api/gdpr/delete", { method: "DELETE" });
      toast.success("Your account has been deleted.");
      window.location.href = "/";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Deletion failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <section className="bg-gradient-to-br from-emerald-900 to-stone-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            Legal
          </span>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Privacy Notice</h1>
          <p className="mt-2 text-stone-300">UK GDPR & DPA 2018 compliant · Last updated June 2026</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Quick links */}
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <a href="#controller" className="rounded-xl border border-ink/10 p-4 text-center text-sm font-medium hover:bg-ink/5 transition">Data Controller</a>
          <a href="#data" className="rounded-xl border border-ink/10 p-4 text-center text-sm font-medium hover:bg-ink/5 transition">What We Collect</a>
          <a href="#rights" className="rounded-xl border border-ink/10 p-4 text-center text-sm font-medium hover:bg-ink/5 transition">Your Rights</a>
          <a href="#cookies" className="rounded-xl border border-ink/10 p-4 text-center text-sm font-medium hover:bg-ink/5 transition">Cookies</a>
        </div>

        {/* Controller info */}
        <Card id="controller" className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-pine" /> Who we are
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-stone-600">
            <p><strong>Data Controller:</strong> Badr Adventures UK</p>
            <p><strong>Contact:</strong> jefferygo0o@gmail.com</p>
            <p><strong>ICO Registration:</strong> We are not required to register with the ICO because we do not process automated decisions or large-scale profiling. However, we follow all GDPR obligations as a matter of good practice.</p>
          </CardContent>
        </Card>

        {/* What data we collect */}
        <Card id="data" className="mb-8">
          <CardHeader>
            <CardTitle>What personal data we collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-stone-600">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink/10">
                  <th className="pb-2 font-medium text-stone-900">Data</th>
                  <th className="pb-2 font-medium text-stone-900">Purpose</th>
                  <th className="pb-2 font-medium text-stone-900">Legal Basis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                <tr><td className="py-2">Name, email, password hash</td><td className="py-2">Account creation & authentication</td><td className="py-2">Contract (art. 6(1)(b))</td></tr>
                <tr><td className="py-2">Contact form data (name, email, message)</td><td className="py-2">Responding to enquiries</td><td className="py-2">Legitimate interests (art. 6(1)(f))</td></tr>
                <tr><td className="py-2">Booking details (party size, dates)</td><td className="py-2">Fulfilling hike bookings</td><td className="py-2">Contract (art. 6(1)(b))</td></tr>
                <tr><td className="py-2">Telegram chat ID</td><td className="py-2">Bot notifications (opt-in only)</td><td className="py-2">Consent (art. 6(1)(a))</td></tr>
                <tr><td className="py-2">Equipment rental data</td><td className="py-2">Fulfilling rental reservations</td><td className="py-2">Contract (art. 6(1)(b))</td></tr>
              </tbody>
            </table>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mt-4">
              <p className="text-sm text-amber-800"><AlertCircle className="inline h-4 w-4 mr-1" />
              <strong>Important:</strong> We do not sell, rent, or share your personal data with third parties for marketing purposes. We only share data with service providers needed to run the service (email delivery, payment processing).</p>
            </div>
          </CardContent>
        </Card>

        {/* Third parties */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Third-party service providers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-stone-600">
            <p><strong>Resend (email):</strong> We use Resend to send transactional emails. Your email address is only used to communicate with you about bookings and enquiries.</p>
            <p><strong>Stripe (payments):</strong> Payment processing is handled entirely by Stripe. We never see or store your card details.</p>
            <p><strong>Telegram:</strong> If you choose to receive notifications via our Telegram bot, your Telegram chat ID is stored. You can revoke this at any time by contacting us.</p>
            <p><strong>Render (hosting):</strong> Our hosting provider processes data on our behalf under a strict data processing agreement.</p>
          </CardContent>
        </Card>

        {/* Retention */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Data retention periods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-stone-600">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>User accounts:</strong> Retained until you delete your account, or 2 years of inactivity.</li>
              <li><strong>Contact messages:</strong> Deleted after 12 months.</li>
              <li><strong>Booking records:</strong> Retained for 7 years for tax and accounting purposes (legal obligation).</li>
              <li><strong>Telegram chat IDs:</strong> Deleted on request or account deletion.</li>
              <li><strong>Equipment bookings:</strong> Retained for 7 years for accounting purposes.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Your rights */}
        <Card id="rights" className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-pine" /> Your rights under UK GDPR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-stone-600">
            <p>You have the following rights. To exercise any of them, contact us at jefferygo0o@gmail.com.</p>
            <ul className="space-y-2">
              <li><strong>Right of access (art. 15):</strong> Request a copy of all personal data we hold about you.</li>
              <li><strong>Right to rectification (art. 16):</strong> Correct any inaccurate or incomplete data.</li>
              <li><strong>Right to erasure (art. 17):</strong> Request deletion of your account and associated data (subject to legal retention obligations for financial records).</li>
              <li><strong>Right to restrict processing (art. 18):</strong> Request that we limit how we use your data.</li>
              <li><strong>Right to data portability (art. 20):</strong> Receive your data in a machine-readable format (JSON).</li>
              <li><strong>Right to object (art. 21):</strong> Object to processing based on legitimate interests.</li>
              <li><strong>Right to lodge a complaint:</strong> You have the right to complain to the Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" className="text-pine underline" target="_blank" rel="noopener">ico.org.uk</a> if you are unsatisfied with how we handle your data.</li>
            </ul>

            {/* Self-service */}
            {user && (
              <div className="mt-6 space-y-3 rounded-xl border border-pine/20 bg-pine/5 p-4">
                <p className="text-sm font-semibold text-stone-900">Self-service (signed in as {user.email})</p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleExport} disabled={exporting} variant="outline" size="sm">
                    <Download className="mr-1.5 h-4 w-4" />
                    {exporting ? "Exporting..." : "Export my data"}
                  </Button>
                  <Button onClick={handleDeleteAccount} disabled={deleting} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    {deleting ? "Deleting..." : "Delete my account"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cookies */}
        <Card id="cookies" className="mb-8">
          <CardHeader>
            <CardTitle>Cookies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-stone-600">
            <p>We use minimal cookies, only what's strictly necessary to run the site:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Session cookie:</strong> Keeps you signed in. HttpOnly, secure, SameSite=Strict. Expires when you close your browser.</li>
              <li><strong>No marketing or analytics cookies</strong> — we do not use any tracking or advertising cookies.</li>
            </ul>
            <p>For full details, see our <Link to="/cookies" className="text-pine underline">Cookie Policy</Link>.</p>
          </CardContent>
        </Card>

        {/* Changes */}
        <Card>
          <CardHeader>
            <CardTitle>Changes to this notice</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-stone-600">
            <p>If we change how we use your data, we'll update this page and notify you by email (if you have an account) or via a notice on the website.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}