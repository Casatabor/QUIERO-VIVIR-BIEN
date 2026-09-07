const LIST_ID = 2;

function cleanText(value, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método no permitido",
    });
  }

  try {
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
      console.error("BREVO_API_KEY no está configurada.");
      return res.status(500).json({
        ok: false,
        error: "Configuración de Brevo incompleta.",
      });
    }

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const name = cleanText(body.name, 100);
    const email = cleanText(body.email, 200).toLowerCase();

    const notesQvb = body.notesQvb === true;
    const guideCompleted = body.guideCompleted === true;
    const shareSummary = body.shareSummary === true;

    const summary =
      body.summary && typeof body.summary === "object"
        ? body.summary
        : {};

    if (!name || !validEmail(email)) {
      return res.status(400).json({
        ok: false,
        error: "Nombre o email inválido.",
      });
    }

    const attributes = {
      NOMBRE: name,
      ORIGEN: "Web QVB",
      GUIA_QVB: "¿Y ahora qué?",
      NOTAS_QVB: notesQvb,
      GUIA_COMPLETADA: guideCompleted,
      COMPARTIO_RESUMEN: shareSummary,
    };

    // El resumen estructurado SOLO se envía si la persona
    // aceptó compartirlo con Catalina.
    if (shareSummary) {
      const joinList = (value, maxLength = 500) => {
        if (!Array.isArray(value)) return "";
        return cleanText(value.join(" | "), maxLength);
      };

      attributes.NECESIDADES_QVB = joinList(summary.needs);
      attributes.QUIERO_MAS = joinList(summary.more);
      attributes.QUIERO_MENOS = joinList(summary.less);
      attributes.VALORES_QVB = joinList(summary.values);

      attributes.AREA_PRIORITARIA = cleanText(
        summary.priorityArea,
        300
      );

      attributes.PROXIMO_PASO = cleanText(
        summary.nextStep,
        1000
      );

      attributes.ACCION_ELEGIDA = joinList(
        summary.actions
      );

      const targetDate = String(
        summary.targetDate || ""
      );

      if (/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        attributes.FECHA_OBJETIVO = targetDate;
      }
    }

    const payload = {
      email,
      attributes,
      listIds: [LIST_ID],
      updateEnabled: true,
    };

    const brevoResponse = await fetch(
      "https://api.brevo.com/v3/contacts",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify(payload),
      }
    );

    const responseText = await brevoResponse.text();

    if (!brevoResponse.ok) {
      console.error(
        "Brevo respondió con error:",
        brevoResponse.status,
        responseText
      );

      return res.status(502).json({
        ok: false,
        error: "Brevo rechazó la actualización del contacto.",
        brevoStatus: brevoResponse.status,
      });
    }

    return res.status(200).json({
      ok: true,
      guideCompleted,
      summaryShared: shareSummary,
    });
  } catch (error) {
    console.error("Error QVB → Brevo:", error);

    return res.status(500).json({
      ok: false,
      error: "No se pudo registrar el contacto.",
    });
  }
}
