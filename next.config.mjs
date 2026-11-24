/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',      // site 100 % statique : dossier out/ à héberger n'importe où
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
