/** @type {import('next').NextConfig} */
const crypto = require('crypto')

const nextConfig = {
  experimental: {
    optimizePackageImports: ['framer-motion', '@radix-ui/react-dropdown-menu', '@radix-ui/react-avatar'],
    // optimizeCss: true, // Disabled due to critters module issue
    optimizeServerReact: true, // Optimize React imports
    // Enable modern JS output
    esmExternals: true,
  },
  transpilePackages: ["lucide-react"],
  output: 'export', // Enable static exports
  images: {
    unoptimized: true, // Required for static export
    domains: ['github.com', 'avatars.githubusercontent.com'],
    formats: ['image/webp', 'image/avif'],
  },
  compress: true,
  poweredByHeader: false,
  env: {
    SITE_URL: 'https://blog.surus.dev',
  },
  
  webpack: (config, { isServer, dev }) => {
    // Handle onnxruntime and related model libraries properly
    config.resolve.alias = {
      ...config.resolve.alias,
      "sharp$": false,
      "onnxruntime-node$": false,
    };
    
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework chunks
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Common libraries
            lib: {
              test(module) {
                return module.size() > 160000 &&
                  /node_modules[/\\]/.test(module.identifier())
              },
              name(module) {
                const hash = crypto.createHash('sha1')
                hash.update(module.libIdent ? module.libIdent({context: 'dir'}) : module.identifier())
                return hash.digest('hex').substring(0, 8)
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // UI Components
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|framer-motion|lucide-react)[\\/]/,
              name: 'ui-components',
              chunks: 'all',
              priority: 20,
            },
            // Markdown processing
            markdown: {
              test: /[\\/]node_modules[\\/](remark|unified|gray-matter)[\\/]/,
              name: 'markdown',
              chunks: 'all',
              priority: 25,
            },
          },
        },
      }
    }
    
    return config;
  },
}

module.exports = nextConfig
