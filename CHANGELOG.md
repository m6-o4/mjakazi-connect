# [2.2.0](https://github.com/m6-o4/mjakazi-connect/compare/v2.1.0...v2.2.0) (2026-08-29)

### Features

- **auth:** implement sign-up flow and branded auth layout
  ([539b732](https://github.com/m6-o4/mjakazi-connect/commit/539b7326fca9d80200f051031e5663dd1b381043))
- **roles:** add domain profiles and role-based dashboards
  ([88cb079](https://github.com/m6-o4/mjakazi-connect/commit/88cb079042f5d69465e8d7928d0751cea16a10ca))
- **roles:** add post-auth role promotion and dispatch
  ([b0faa32](https://github.com/m6-o4/mjakazi-connect/commit/b0faa329820702b1abb5707c7636e8ba07dcd44e))

# [2.1.0](https://github.com/m6-o4/mjakazi-connect/compare/v2.0.1...v2.1.0) (2026-08-26)

### Features

- **audit:** add audit log collection and writeAuditLog utility
  ([3abeeb3](https://github.com/m6-o4/mjakazi-connect/commit/3abeeb3bae951b61b25219599852ca459f05f435))

## [2.0.1](https://github.com/m6-o4/mjakazi-connect/compare/v2.0.0...v2.0.1) (2026-08-10)

### Bug Fixes

- **jobs:** correct role for queue access
  ([1aee0fb](https://github.com/m6-o4/mjakazi-connect/commit/1aee0fb451db0c2a05bf0f709e4c49c51f755444))

# [2.0.0](https://github.com/m6-o4/mjakazi-connect/compare/v1.1.1...v2.0.0) (2026-08-10)

### Bug Fixes

- **auth:** align payload layout role check with RBAC
  ([fc2ed16](https://github.com/m6-o4/mjakazi-connect/commit/fc2ed16f062c4082a9a6605c6c3ea547e0527580))
- **clerk:** guard user provisioning against role and race conditions
  ([91bcaa0](https://github.com/m6-o4/mjakazi-connect/commit/91bcaa0ab0fab962f4d66c7c8d1c9f112c0a4bae))

### Features

- **access:** redefine RBAC with staff and saas roles
  ([b30fb14](https://github.com/m6-o4/mjakazi-connect/commit/b30fb14c6892720d25485458745d6b6562aa545b))
- **jobs:** add new jobs module
  ([2cb941e](https://github.com/m6-o4/mjakazi-connect/commit/2cb941e0d424a684438fad9e047746b92a3a81e4))

### BREAKING CHANGES

- **access:** editor and user roles are removed; any existing users with those roles must
  be migrated to the new role set.

## [1.1.1](https://github.com/m6-o4/mjakazi-connect/compare/v1.1.0...v1.1.1) (2026-08-07)

### Bug Fixes

- **auth:** allow www subdomain for Clerk authorized parties
  ([3391eea](https://github.com/m6-o4/mjakazi-connect/commit/3391eea1bff128ef3c680221ef7373134ab0ba42))
- **docker:** include www subdomain in Traefik routing
  ([f02f86b](https://github.com/m6-o4/mjakazi-connect/commit/f02f86bc67dda5bd0f4db909f8ec8ba62d7396d8))

# [1.1.0](https://github.com/m6-o4/mjakazi-connect/compare/v1.0.0...v1.1.0) (2026-08-06)

### Bug Fixes

- **header-footer:** hide text on large screens to avoid duplication with logo
  ([b0de808](https://github.com/m6-o4/mjakazi-connect/commit/b0de808d6bb35c7ff4a4d82c3cd222c49f7dcd51))

### Features

- **calls-to-action:** add headlineDescription to default admin columns
  ([e9439b1](https://github.com/m6-o4/mjakazi-connect/commit/e9439b109968ebe9f714157fa93424a9890935c2))
- **categories:** restrict CRUD operations to admin or editor roles
  ([6c679f1](https://github.com/m6-o4/mjakazi-connect/commit/6c679f1b3fee5f512acd2d6d948c6edfe69b77fa))

# 1.0.0 (2026-08-06)

### Bug Fixes

- **archive:** replace broken fallback image with mjakazi-connect logo
  ([5dd5a87](https://github.com/m6-o4/mjakazi-connect/commit/5dd5a872cbf79034d187a22976f6150d3dda8577))
- **deps:** downgrade next and eslint-config-next to 16.2.12
  ([11b7c6f](https://github.com/m6-o4/mjakazi-connect/commit/11b7c6f43e5855c77b6c1920737e27474ac9ea20))
- **footer:** correct typo in mwajiri items field name
  ([ff6e38c](https://github.com/m6-o4/mjakazi-connect/commit/ff6e38c40ea320cb6243a5c676e17f51ef12c7d0))

### Features

- **blocks:** add features block with icons and links, update site assets
  ([155f4ee](https://github.com/m6-o4/mjakazi-connect/commit/155f4eeace98834646461a8589a4b500f3ac4b1f))
- **blocks:** add hero block with configurable content and CTAs
  ([cb11f94](https://github.com/m6-o4/mjakazi-connect/commit/cb11f948f38ba69708bfbb31161ebe5c47696653))
- **blocks:** replace archive block with content editor and posts archive
  ([ef201cf](https://github.com/m6-o4/mjakazi-connect/commit/ef201cf82b4304154fb568a77b6096b4e7989e83))
- **cta:** add call-to-action block and collection
  ([3ef7594](https://github.com/m6-o4/mjakazi-connect/commit/3ef75949920877c02e2e6b7048d93677651acf02))
- **footer:** add configurable footer global with link columns
  ([be63c1c](https://github.com/m6-o4/mjakazi-connect/commit/be63c1cffbf32ffe82de265f7ade585661b626fa))
- **globals:** make header and footer organization fields optional
  ([9c2ca51](https://github.com/m6-o4/mjakazi-connect/commit/9c2ca51370ff3691946b97ba8be5b78e5c4f2d98))
- **header:** add configurable header global with navigation and auth links
  ([48abbb8](https://github.com/m6-o4/mjakazi-connect/commit/48abbb870020f2fc5d4ca0f898e19fd444692aed))
- **how-it-works:** introduce process breakdown block with configurable steps
  ([91bcfb6](https://github.com/m6-o4/mjakazi-connect/commit/91bcfb68f997d7a8e5407d622795b9140da7c49f))
- **media:** support SVG images and update favicon
  ([20b75a0](https://github.com/m6-o4/mjakazi-connect/commit/20b75a03730fad6b7670a8a01984ba8204300dfa))
- **posts:** add post detail page and author formatting utilities
  ([62ebd89](https://github.com/m6-o4/mjakazi-connect/commit/62ebd898b7f8de99199a7f8713a4aa191f04cb73))
- **pricing:** add pricing block with plans, CTA, and link support
  ([5fcbb47](https://github.com/m6-o4/mjakazi-connect/commit/5fcbb479d4effa6f84bee7818436067f222121a5))
- **registration:** add registration block with dual card layout
  ([c74b04e](https://github.com/m6-o4/mjakazi-connect/commit/c74b04e77a8657736dfc17a1d0d76be68fd51ba6))
- **styles:** add Tailwind typography plugin
  ([2eca0fa](https://github.com/m6-o4/mjakazi-connect/commit/2eca0fac01a8d00a70493d0dc5f8620ac42bb954))
- **testimonials:** add testimonials block with types and rendering
  ([b6909a9](https://github.com/m6-o4/mjakazi-connect/commit/b6909a983f5cba9b06b63a7c682fb93a497330dc))
- **theme:** add success and warning semantic color tokens
  ([fe3a9bf](https://github.com/m6-o4/mjakazi-connect/commit/fe3a9bfcea05394997f3117f19f0212e8320cb0e))
- **tokens:** add success and warning foreground color tokens
  ([40ada36](https://github.com/m6-o4/mjakazi-connect/commit/40ada36f612c4942256d1112b22c8ccaa408de8d))
- **ui:** add brand design system and assets
  ([a016a7a](https://github.com/m6-o4/mjakazi-connect/commit/a016a7a413a62ebeda844cce9eff12413c11c8f5))
- **ui:** add toast notification component
  ([30e2bae](https://github.com/m6-o4/mjakazi-connect/commit/30e2baec994b8a921fee8da0890ae5487811497d))
- **webhook:** add payment webhook endpoint
  ([bdbc22c](https://github.com/m6-o4/mjakazi-connect/commit/bdbc22c97b031fbc31401077d766b17852acb299))

### Performance Improvements

- **posts-archive:** add responsive sizes attribute to thumbnails
  ([fa27dbc](https://github.com/m6-o4/mjakazi-connect/commit/fa27dbcfdf59fb492c04ca0f5ace401d907f3176))
