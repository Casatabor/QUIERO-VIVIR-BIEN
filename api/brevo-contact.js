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
  const shareSummary = body.shareSummary === true;
  const summary = body.summary && typeof body.summary === "object" ? body.summary : {};

  if (!name || !validEmail(email)) {
    return res.status(400).json({ error: "Nombre o email inválido." });
  }

  const attributes = {
    NOMBRE: name,
    ORIGEN: "Web QVB",
    GUIA_QVB: "¿Y ahora qué?",
    NOTAS_QVB: notesQvb,
    GUIA_COMPLETADA: guideCompleted,
    COMPARTIO_RESUMEN: shareSummary
  };

  // Solo enviamos el resumen estructurado cuando la persona lo autoriza.
  // Las reflexiones abiertas no se envían a Brevo.
  if (shareSummary) {
    const joinList = (value, maxLength = 500) =>
      Array.isArray(value) ? cleanText(value.join(" | "), maxLength) : "";

    attributes.NECESIDADES_QVB = joinList(summary.needs);
    attributes.QUIERO_MAS = joinList(summary.more);
    attributes.QUIERO_MENOS = joinList(summary.less);
    attributes.VALORES_QVB = joinList(summary.values);
    attributes.AREA_PRIORITARIA = cleanText(summary.priorityArea, 300);
    attributes.PROXIMO_PASO = cleanText(summary.nextStep, 1000);
    attributes.ACCION_ELEGIDA = joinList(summary.actions);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(summary.targetDate || ""))) {
      attributes.FECHA_OBJETIVO = String(summary.targetDate);
    }
  }

  const payload = {
    email,
    attributes,
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
