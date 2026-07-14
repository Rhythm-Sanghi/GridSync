/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow peerjs to be bundled (it uses Node built-ins via browser shims)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
