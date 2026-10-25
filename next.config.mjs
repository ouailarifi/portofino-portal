/** @type {import('next').NextConfig} */
const nextConfig = {
  // Evita que el menú del manager (profesionales, clientes, liquidaciones…)
  // muestre una foto desactualizada al volver atrás: Next.js por defecto
  // guarda en el navegador las páginas dinámicas durante 30s y, al navegar
  // fuera y volver dentro de ese tiempo, puede mostrar los datos de antes
  // de un alta/baja/cobro en vez de pedirlos de nuevo al servidor.
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
