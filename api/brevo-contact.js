const BREVO_URL = "https://api.brevo.com/v3/contacts";
const LIST_ID = 2;

function cleanText(value, maxLength = 160) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 160;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("BREVO_API_KEY is missing");
    return res.status(500).json({ error: "La conexión con QVB no está configurada." });
  }

  const body = req.body || {};
  const website = cleanText(body.website, 120);
  if (website) return res.status(200).json({ ok: true }); // honeypot

  const name = cleanText(body.name, 80);
  const email = cleanText(body.email, 160).toLowerCase();
  const notesQvb = body.notesQvb === true;
  const guideCompleted = body.guideCompleted === true;

  if (!name || !validEmail(email)) {
    return res.status(400).json({ error: "Nombre o email inválido." });
  }

  const payload = {
    email,
    attributes: {
      NOMBRE: name,
      ORIGEN: "Web QVB",
      GUIA_QVB: "¿Y ahora qué?",
      NOTAS_QVB: notesQvb,
      GUIA_COMPLETADA: guideCompleted
    },
    listIds: [LIST_ID],
    updateEnabled: true
  };

  try {
    const brevoResponse = await fetch(BREVO_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await brevoResponse.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

    if (!brevoResponse.ok) {
      console.error("Brevo error", brevoResponse.status, data);
      return res.status(502).json({ error: "Brevo no pudo registrar el contacto." });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Brevo request failed", error);
    return res.status(502).json({ error: "No fue posible conectar con Brevo." });
  }
}
