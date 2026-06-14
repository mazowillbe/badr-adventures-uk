import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CookiesPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-emerald-900 to-stone-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            Legal
          </span>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Cookie Policy</h1>
          <p className="mt-2 text-stone-300">UK GDPR compliant · Last updated June 2026</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>What are cookies?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-stone-600">
            <p>Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and provide a functional experience.</p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Cookies we use</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-stone-600">
            <p className="mb-4">We use <strong>only essential (strictly necessary) cookies</strong>. These are required for the website to function and cannot be switched off in our system. They are usually set in response to actions you take, such as signing in or filling in forms.</p>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink/10">
                  <th className="pb-2 font-medium text-stone-900">Name</th>
                  <th className="pb-2 font-medium text-stone-900">Purpose</th>
                  <th className="pb-2 font-medium text-stone-900">Expiry</th>
                  <th className="pb-2 font-medium text-stone-900">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                <tr>
                  <td className="py-2 font-mono text-xs">session</td>
                  <td className="py-2">Keeps you signed in while you use the site</td>
                  <td className="py-2">Session (expires when you close your browser)</td>
                  <td className="py-2">Essential — HttpOnly, Secure, SameSite=Strict</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-4">We do <strong>not</strong> use any of the following:</p>
            <ul className="mt-2 list-disc list-inside space-y-1 text-stone-600">
              <li>Analytics or performance cookies (e.g. Google Analytics)</li>
              <li>Marketing or advertising cookies</li>
              <li>Third-party tracking cookies</li>
              <li>Social media embedded cookies (unless you explicitly click a social link)</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Managing cookies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-stone-600">
            <p>Most web browsers allow you to control cookies through their settings. Here are links for common browsers:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><a href="https://support.google.com/chrome/answer/95647" className="text-pine underline" target="_blank" rel="noopener">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" className="text-pine underline" target="_blank" rel="noopener">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/guide/safari/sfri11471/mac" className="text-pine underline" target="_blank" rel="noopener">Apple Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" className="text-pine underline" target="_blank" rel="noopener">Microsoft Edge</a></li>
            </ul>
            <p>Disabling essential cookies will prevent you from signing in or making bookings.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cookie consent</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-stone-600">
            <p>Because we only use essential cookies that are strictly necessary for the service to function, we do not require explicit cookie consent under UK GDPR (as these are exempt under Regulation 6(1)(a) — essential service). However, we are transparent about what we use and why.</p>
            <p className="mt-2">If you have any questions about our use of cookies, please contact us at <a href="mailto:jefferygo0o@gmail.com" className="text-pine underline">jefferygo0o@gmail.com</a>.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}