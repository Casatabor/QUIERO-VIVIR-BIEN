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
  if (!apiKey) {
    console.error("BREVO_API_KEY is missing");
    return res.status(500).json({ error: "La conexión con QVB no está configurada." });
  }

  const body = req.body || {};
  const name = cleanText(body.name, 80);
  const email = cleanText(body.email, 160).toLowerCase();
  const shareSummary = body.shareSummary === true;
  const summary = body.summary && typeof body.summary === "object" ? body.summary : {};

  if (!name || !validEmail(email)) {
    return res.status(400).json({ error: "Nombre o email inválido." });
  }

  // These IDs match the actual Brevo contact attributes in QVB.
  const attributes = {
    NOMBRE: name,
    GUIA_COMPLETADA: true,
    COMPARTIO_RESUMEN: shareSummary
  };

  if (shareSummary) {
    attributes.NECESIDADES_QVB = joinList(summary.needs);
    attributes.QUIERO_MAS = joinList(summary.more);
    attributes.QUIERO_MENOS = joinList(summary.less);
    attributes.VALORES_QVB = joinList(summary.values);
    attributes.AREA_PRIORITARIA = cleanText(summary.priorityArea, 300);
    attributes.PROXIMO_PASO = cleanText(summary.nextStep, 1000);
    attributes.ACCION_ELEGIDA = joinList(summary.actions);

    const date = String(summary.targetDate || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      attributes.FECHA_OBJETIVO = date;
    }
  }

  try {
    // Use Brevo's UPDATE CONTACT endpoint directly. This avoids any ambiguity
    // from create-contact + updateEnabled and updates the existing lead by email.
    const url = `${BREVO_BASE}/${encodeURIComponent(email)}`;
    const brevoResponse = await fetch(url, {
      method: "PUT",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({ attributes })
    });

    const text = await brevoResponse.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

    if (!brevoResponse.ok) {
      console.error("Brevo summary update error", brevoResponse.status, data, attributes);
      return res.status(502).json({
        error: "Brevo no pudo guardar el resumen.",
        brevoStatus: brevoResponse.status
      });
    }

    return res.status(200).json({
      ok: true,
      version: "qvb-summary-v2",
      shared: shareSummary,
      fieldsSent: Object.keys(attributes)
    });
  } catch (error) {
    console.error("Brevo summary request failed", error);
    return res.status(502).json({ error: "No fue posible conectar con Brevo." });
  }
};
