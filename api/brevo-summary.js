const BREVO_BASE = "https://api.brevo.com/v3/contacts";

function cleanText(value, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}
function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 160;
}
function joinList(value, maxLength = 500) {
  return Array.isArray(value) ? cleanText(value.join(" | "), maxLength) : "";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "La conexión con QVB no está configurada." });

  const body = req.body || {};
  const name = cleanText(body.name, 80);
  const email = cleanText(body.email, 160).toLowerCase();
  const summary = body.summary && typeof body.summary === "object" ? body.summary : {};

  if (!name || !validEmail(email)) {
    return res.status(400).json({ error: "Nombre o email inválido." });
  }

  const attributes = {
    NOMBRE: name,
    GUIA_COMPLETADA: true,
    COMPARTIO_RESUMEN: true,
    NECESIDADES_QVB: joinList(summary.needs),
    QUIERO_MAS: joinList(summary.more),
    QUIERO_MENOS: joinList(summary.less),
    VALORES_QVB: joinList(summary.values),
    AREA_PRIORITARIA: cleanText(summary.priorityArea, 300),
    PROXIMO_PASO: cleanText(summary.nextStep, 1000),
    ACCION_ELEGIDA: joinList(summary.actions)
  };

  const date = String(summary.targetDate || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) attributes.FECHA_OBJETIVO = date;

  try {
    const response = await fetch(`${BREVO_BASE}/${encodeURIComponent(email)}`, {
      method: "PUT",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({ attributes })
    });

    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

    if (!response.ok) {
      console.error("QVB_BREVO_SUMMARY_ERROR", response.status, data);
      return res.status(502).json({ error: "Brevo no pudo guardar el resumen." });
    }

    console.log("QVB_BREVO_SUMMARY_OK", {
      fieldsSent: Object.keys(attributes),
      needsCount: Array.isArray(summary.needs) ? summary.needs.length : 0,
      moreCount: Array.isArray(summary.more) ? summary.more.length : 0,
      lessCount: Array.isArray(summary.less) ? summary.less.length : 0,
      valuesCount: Array.isArray(summary.values) ? summary.values.length : 0,
      actionsCount: Array.isArray(summary.actions) ? summary.actions.length : 0
    });

    return res.status(200).json({ ok: true, shared: true, fieldsSent: Object.keys(attributes) });
  } catch (error) {
    console.error("QVB_BREVO_SUMMARY_REQUEST_FAILED", error);
    return res.status(502).json({ error: "No fue posible conectar con Brevo." });
  }
};
