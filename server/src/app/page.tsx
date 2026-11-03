export default function Home() {
  return (
    <main className="wrap">
      <h1>English Coach API</h1>
      <p>This server powers the English Coach phone app. There is nothing to use here directly.</p>
      <ul>
        <li>
          <code>GET /api/health</code> shows whether the database, email, speech and AI services are configured.
        </li>
        <li>
          <code>POST /api/auth/request-code</code> and <code>POST /api/auth/verify</code> handle sign-in with an emailed code.
        </li>
        <li>
          <code>GET /api/me</code> and <code>PATCH /api/me</code> read and update your profile.
        </li>
        <li>
          <code>POST /api/speech/assess</code> scores a spoken sentence.
        </li>
      </ul>
    </main>
  );
}
