"use client"
import Link from "next/link"
import { ChevronUp } from "lucide-react"

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-primary text-center mb-2">Terms of Use and Service</h1>
          <p className="text-center mb-8">Effective Date: March 10, 2025</p>

          <div className="bg-blue-50 border-l-4 border-primary-500 p-4 mb-8 rounded">
            <h2 className="font-bold text-lg mb-2">Fun Project Disclaimer:</h2>
            <p>
              Rankiha is a lighthearted, fun project designed for entertainment purposes only. The ratings, rankings,
              and comments generated on this platform are subjective and should not be taken as an official assessment
              of academic performance, personal character, or potential. Enjoy the service in the spirit of fun, and
              please do not rely on it for serious or professional evaluations.
            </p>
          </div>

          <div className="space-y-8">
            <section id="acceptance" className="scroll-mt-20">
              <h2 className="text-xl font-bold mb-3 text-primary">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Rankiha, you agree to be bound by these Terms of Use and Service. If you do not
                agree to these Terms, you must not access or use the Service.
              </p>
            </section>

            <section id="description" className="scroll-mt-20">
              <h2 className="text-xl font-bold mb-3 text-primary">2. Description of the Service</h2>
              <p className="mb-3">
                Rankiha is an online platform that allows university students to rate and rank their peers. Users
                authenticate using their university email address and full name, both of which are publicly available.
              </p>
              <p className="mb-3">The Service stores:</p>
              <ul className="list-disc pl-6 mb-3 space-y-1">
                <li>Personal Data: University email addresses and full names.</li>
                <li>
                  User-Generated Data: Ratings (numerical scores) and anonymous comments linked to the destination user.
                </li>
              </ul>
              <p>Only registered and logged-in users may submit ratings and comments for other registered users.</p>
            </section>

            <section id="eligibility" className="scroll-mt-20">
              <h2 className="text-xl font-bold mb-3 text-primary">3. Eligibility and Account Registration</h2>
              <div className="mb-3">
                <h3 className="font-semibold mb-1">Eligibility:</h3>
                <p>
                  You must be a current university student to use Rankiha. By registering, you confirm that you meet
                  this requirement.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Account Registration:</h3>
                <p>
                  When you register, you agree to provide accurate, current, and complete information (i.e., your
                  university email and full name). You are responsible for maintaining the confidentiality of your
                  account credentials and for all activities that occur under your account.
                </p>
              </div>
            </section>

            <section id="data" className="scroll-mt-20">
              <h2 className="text-xl font-bold mb-3 text-primary">4. Data Collection and Use</h2>
              <div className="mb-3">
                <h3 className="font-semibold mb-1">Data Collected:</h3>
                <p>
                  Rankiha collects only publicly available personal data (university email and full name) during account
                  creation. Additionally, all ratings and anonymous comments are securely stored in our database.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Data Use:</h3>
                <p>
                  The collected data is used solely for authentication, the operation of the Service, and facilitating
                  the ranking process. Although comments are publicly displayed as anonymous, they are internally linked
                  to your account for moderation purposes.
                </p>
              </div>
            </section>

            <section id="conduct" className="scroll-mt-20">
              <h2 className="text-xl font-bold mb-3 text-primary">5. User Conduct and Content Guidelines</h2>
              <div className="mb-3">
                <h3 className="font-semibold mb-1">General Conduct:</h3>
                <p>
                  You agree to use the Service responsibly and not to engage in any behavior that is harmful,
                  defamatory, harassing, or otherwise violates the rights of other users.
                </p>
              </div>
              <div className="mb-3">
                <h3 className="font-semibold mb-1">Ratings and Comments:</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Ratings are subjective and reflect personal opinions.</li>
                  <li>
                    Comments are displayed as "anonymous" to the public; however, administrative staff have access to
                    the comment origins for moderation and abuse prevention.
                  </li>
                  <li>
                    By posting comments, you consent to their anonymous public display while acknowledging that an
                    internal record is maintained.
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Content Moderation:</h3>
                <p>
                  Rankiha reserves the right to remove or modify any content deemed abusive, defamatory, or in violation
                  of these Terms without prior notice. Administrators will actively monitor content to prevent misuse
                  and take appropriate action when necessary.
                </p>
              </div>
            </section>

            <section id="prohibited" className="scroll-mt-20">
              <h2 className="text-xl font-bold mb-3 text-primary">6. Prohibited Activities and Security</h2>
              <div className="mb-3">
                <h3 className="font-semibold mb-1">Illegal Attacks and Unauthorized Access:</h3>
                <p className="mb-2">
                  You are strictly prohibited from engaging in any form of illegal activity that may compromise the
                  security or integrity of Rankiha. This includes, but is not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>
                    Distributed Denial-of-Service (DDoS) attacks, hacking, or any attempt to access data or systems
                    without authorization.
                  </li>
                  <li>Introducing malware, viruses, or other harmful software.</li>
                  <li>Circumventing or bypassing security measures implemented by Rankiha.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Consequences:</h3>
                <p>
                  Any attempt to conduct illegal attacks or unauthorized access may result in immediate suspension or
                  termination of your account and could lead to civil and/or criminal legal action, including lawsuits.
                </p>
              </div>
            </section>

            <section id="intellectual" className="scroll-mt-20">
              <h2 className="text-xl font-bold mb-3 text-primary">7. Intellectual Property Rights</h2>
              <div className="mb-3">
                <h3 className="font-semibold mb-1">Ownership:</h3>
                <p>
                  All intellectual property rights related to the design, software, graphics, and content provided by
                  Rankiha are owned by Rankiha or its licensors.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">User-Generated Content License:</h3>
                <p>
                  By submitting any content (ratings, comments, etc.) to the Service, you grant Rankiha a worldwide,
                  non-exclusive, royalty-free license to use, reproduce, modify, adapt, and display your content solely
                  for the operation and promotion of the Service.
                </p>
              </div>
            </section>

            <section id="disclaimers" className="scroll-mt-20">
              <h2 className="text-xl font-bold mb-3 text-primary">8. Disclaimers and Limitation of Liability</h2>
              <div className="mb-3">
                <h3 className="font-semibold mb-1">Disclaimer of Warranties:</h3>
                <p>
                  The Service is provided on an "as is" and "as available" basis without any warranties, express or
                  implied. Rankiha does not guarantee the accuracy, reliability, or quality of user-generated content.
                  In addition, as a fun project, the Service is intended for amusement only, and no serious conclusions
                  or decisions should be drawn from the content provided.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Limitation of Liability:</h3>
                <p>
                  To the fullest extent permitted by applicable law, Rankiha and its affiliates, directors, employees,
                  or agents shall not be liable for any direct, indirect, incidental, consequential, or punitive damages
                  arising out of or related to your use or inability to use the Service.
                </p>
              </div>
            </section>

            <section id="indemnification" className="scroll-mt-20">
              <h2 className="text-xl font-bold mb-3 text-primary">9. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless Rankiha, its affiliates, officers, directors, employees, and
                agents from any claims, damages, losses, or expenses (including legal fees) arising out of or in
                connection with your use of the Service, violation of these Terms, or infringement of any rights of a
                third party.
              </p>
            </section>

            <section id="comments" className="scroll-mt-20">
              <h2 className="text-xl font-bold mb-3 text-primary">10. Comments and Anonymity</h2>
              <div className="mb-3">
                <h3 className="font-semibold mb-1">Anonymous Display:</h3>
                <p>Comments you post will appear as "anonymous" to all users on the platform.</p>
              </div>
              <div className="mb-3">
                <h3 className="font-semibold mb-1">Internal Logging:</h3>
                <p>
                  For moderation and abuse prevention, an internal log will associate each anonymous comment with the
                  original account that posted it. This information is accessible only to authorized administrative
                  personnel.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Disclosure and Consent:</h3>
                <p>
                  By posting content, you acknowledge and consent that while your identity is not publicly disclosed,
                  Rankiha retains an internal record linking your identity to your anonymous comment.
                </p>
              </div>
            </section>

            <section id="modifications" className="scroll-mt-20">
              <h2 className="text-xl font-bold mb-3 text-primary">11. Modifications and Termination</h2>
              <div className="mb-3">
                <h3 className="font-semibold mb-1">Modifications:</h3>
                <p>
                  Rankiha reserves the right to modify or update these Terms at any time. Changes will be posted on this
                  page, and your continued use of the Service constitutes acceptance of such changes.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Termination:</h3>
                <p>
                  We may suspend or terminate your access to the Service without prior notice for any conduct that
                  violates these Terms or poses a risk to the platform or its users.
                </p>
              </div>
            </section>

            <section id="governing" className="scroll-mt-20">
              <h2 className="text-xl font-bold mb-3 text-primary">12. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the People's Republic of
                Algeria.
              </p>
            </section>

            <section id="waiver" className="scroll-mt-20">
              <h2 className="text-xl font-bold mb-3 text-primary">13. Waiver and Severability</h2>
              <div className="mb-3">
                <h3 className="font-semibold mb-1">Waiver:</h3>
                <p>
                  Failure to enforce any provision of these Terms does not constitute a waiver of that provision or any
                  other provision.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Severability:</h3>
                <p>
                  If any part of these Terms is found to be invalid or unenforceable, the remainder of the Terms will
                  continue in full force and effect.
                </p>
              </div>
            </section>

            <section id="feedback" className="scroll-mt-20">
              <h2 className="text-xl font-bold mb-3 text-primary">14. Feedback and Suggestions</h2>
              <p>
                Any feedback or suggestions you provide regarding Rankiha become the property of Rankiha. You grant us
                the right to use such feedback without any compensation or obligation to you.
              </p>
            </section>

            <section id="entire" className="scroll-mt-20">
              <h2 className="text-xl font-bold mb-3 text-primary">15. Entire Agreement</h2>
              <p>
                These Terms, along with any other legal notices published on the Service, constitute the entire
                agreement between you and Rankiha regarding your use of the Service.
              </p>
            </section>

            <section id="contact" className="scroll-mt-20">
              <h2 className="text-xl font-bold mb-3 text-primary">16. Contact Information</h2>
              <p className="mb-2">For any questions or concerns regarding these Terms, please contact us at:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  Email:{" "}
                  <a href="mailto:t_rehail@estin.dz" className="text-primary hover:underline">
                    t_rehail@estin.dz
                  </a>
                </li>
                <li>
                  Email:{" "}
                  <a href="mailto:b_bouabca@estin.dz" className="text-primary hover:underline">
                    b_bouabca@estin.dz
                  </a>
                </li>
              </ul>
            </section>
          </div>

          <div className="fixed bottom-6 right-6">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
              aria-label="Scroll to top"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

