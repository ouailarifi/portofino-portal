import Stripe from "stripe";

// Un único cliente de Stripe para todo el servidor. La clave es secreta —
// solo vive como variable de entorno, nunca en el código ni en el navegador.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-09-30.endive",
});
