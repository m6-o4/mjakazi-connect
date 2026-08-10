# [1.27.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.26.0...v1.27.0) (2026-05-13)

### Features

- **wajakazi:** add revalidation hook and improve code documentation
  ([f786a9e](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/f786a9e8a5106a44ba6a3fb8dc52355f46702a4a))

# [1.26.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.25.0...v1.26.0) (2026-05-09)

### Features

- **audit:** add eoi_sent action to audit logging
  ([79a0e34](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/79a0e347f77b903c436b72a46d2338f1209ea166))
- **email:** define explicit interfaces for transactional templates
  ([8e1d9eb](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/8e1d9eb8c96c1718473e332f93ac7ed47fc27bd2))
- **eoi:** implement expression of interest workflow
  ([6658efb](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/6658efbf768657aa870634a4d6212bbb0bab576a))
- **mjakazi:** implement opportunities inbox and availability management
  ([7e5081d](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/7e5081d283bda9a042fb4ec1d479dbd5dad7015e))
- **sa:** integrate revenue tracking and metrics dashboard
  ([1285ba2](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/1285ba2624fbf7a1618c34e70ae758cd15b6b922))
- **scripts:** add generate:it command
  ([521398b](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/521398b9a1c25f817ea1911a9134a868494b148c))
- **ui:** add dynamic notification badge to dashboard topbar
  ([99fd881](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/99fd881ef9e9534f397ea0f4469caa6a4f8d7d3e))
- **ui:** restrict duplicate expressions of interest
  ([ead0d65](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/ead0d65c63efa6142ee9e7f6e871b9ac388aac6d))

# [1.25.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.24.0...v1.25.0) (2026-05-08)

### Features

- **config:** add pnpm-workspace.yaml for monorepo support
  ([52d3c72](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/52d3c72d5963bc1815315015d7862a81626ebacb))

# [1.24.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.23.0...v1.24.0) (2026-05-08)

### Features

- **blocks:** implement dynamic profile fetching in wajakazi-archive
  ([02f2b4b](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/02f2b4b011a95c6a62ae986a2ed8ee25e9e0856b))
- **dashboard:** add phone number field to worker profiles
  ([6180801](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/6180801757b06f3fb6dc56c6007a910bd5f765be))
- **dashboard:** enable worker directory access for employers
  ([3c4be9f](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/3c4be9ffa6008e20400f1fa6807aeed89c68f1b2))
- **dashboard:** implement admin and super admin overview metrics
  ([c483835](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/c483835c2dc93d5a5ac9d9e947a1bd0af73f473f))
- **dashboard:** implement paywall for worker browsing
  ([b672527](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/b67252743a1122144e5a7de2bf13a6bedb773a43))
- **dashboard:** implement worker profile detail view
  ([7427b51](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/7427b5187cc114bfde064a343ee1dedf173a3a3a))

# [1.23.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.22.1...v1.23.0) (2026-05-06)

### Features

- **docs:** add admin dashboard home screenshot
  ([8ae1395](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/8ae13953623d03afe72b6a14309a59ea36f214a1))
- **inngest:** implement payment and subscription timeout recovery
  ([07a5c19](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/07a5c1928e42da738ce527b7db086cf434e93650))
- **media:** add svg support to mime types
  ([a6b5eb8](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/a6b5eb882e4c1524849c2e478224313df891e191))

## [1.22.1](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.22.0...v1.22.1) (2026-04-24)

### Bug Fixes

- **email:** implement lazy initialization for resend client
  ([95bebac](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/95bebac91b102991f6be72a96575a7035a307f07))

# [1.22.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.21.0...v1.22.0) (2026-04-24)

### Features

- **api:** add webhook callback endpoint for subscription events
  ([fa752d0](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/fa752d075af467b3d9dbcc38b239e721e3d94d90))
- **audit-logs:** implement audit log dashboard views and table component
  ([cb935bd](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/cb935bda65059446b05afa1c9f194c372d010846))
- **audit:** add audit logs collection and utility library
  ([b29fadd](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/b29fadd0d833b8a46a0df7f741d730dd2ad92b8c))
- **config:** add dynamic subscription tiers to platform settings
  ([cdc1d0e](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/cdc1d0e6596e5ffa60dea031c0630d5cb9324e67))
- **db:** denormalize subscription data into waajiri profiles
  ([a6af54c](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/a6af54cc254722ff0f168cbc851a990100cc14c0))
- **db:** implement subscriptions collection
  ([3c95de9](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/3c95de9c35b89bd9d083e65b62b662300e47e9cd))
- **email:** implement transactional email notification system
  ([4bdec8e](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/4bdec8e962d5d3d39113996ad5c75585786ba930))
- **inngest:** implement automated subscription lifecycle management
  ([8317449](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/831744920c48d98e1bde05c5ef619c6b6e90dbd3))
- **mjakazi:** add document viewing page with vault API integration
  ([63e7da3](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/63e7da3a800b0d0ed51bbdda14f5759ac109e5b3))
- **payments:** instrument payment lifecycle with audit logging
  ([ddb9cbe](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/ddb9cbe7e0c1794c37ecdfb0f6dc0f993194f786))
- **ui:** add subscription management interface for mwajiri
  ([5c874d0](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/5c874d03e35587636f3242d4dbb2290afd2668c9))
- **verification:** instrument approve and reject routes with audit logging
  ([14a6266](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/14a62661a1245360ca547c0695a2932fadfea904))
- **verification:** instrument document uploads with audit logging and dependency updates
  ([14659f2](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/14659f269e23e937e576956d62525bacc57c6f82))

# [1.21.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.20.0...v1.21.0) (2026-04-17)

### Features

- **api:** implement M-Pesa payment callback endpoint
  ([8657286](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/865728624955436f1bbb34d1727d61d9ccd41244))
- **inngest:** add payment timeout background job handler
  ([0feaa01](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/0feaa013251ca4db82ed4cf01b63293af371024b))
- **mjakazi:** enforce resubmission attempt cap and surface rejection reason
  ([f99074b](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/f99074b954d9d7ffe810a7f00941326c3003e264))
- **mjakazi:** refresh router after submission and improve polling reliability
  ([f22702a](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/f22702af074b6518db9f2b4d23dbbfb15ec19ade))
- **mjakazi:** replace dev payment bypass with PaymentCard component
  ([f9e848c](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/f9e848c0151d18c02e785618acc860f19bf5afc4))
- **payments:** add M-Pesa integration and payment initiation API
  ([5f77aac](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/5f77aac183f9d10be65a78f9ebcf75ccc1df2f89))
- **payments:** add payments collection with admin/SA-only access guard
  ([51f20cf](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/51f20cf55af2c7c26297bee7992c26de77f916ba))
- **sa:** add platform-settings global and dynamic registration fee
  ([75de979](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/75de9797041ea3dea4c1cd2b60364d8d0338952d))

# [1.20.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.19.0...v1.20.0) (2026-04-07)

### Features

- **dashboard:** add page-level metadata titles across all dashboard routes
  ([6eab212](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/6eab2124c1f12ba9678019be51b0e39337c4db98))

# [1.19.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.18.0...v1.19.0) (2026-04-07)

### Bug Fixes

- **auth:** clear unsafeMetadata on role assignment and purge orphaned profiles
  ([581823f](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/581823fbab3846af31234c21fd25a5cf03c62d8a))
- **sa:** refresh router after successful staff creation to sync server data
  ([f6c86b7](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/f6c86b74cd3f243f129191382caf5dca45da7d37))
- **sign-up:** prevent role override during Clerk's internal sign-up redirects
  ([ed762da](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/ed762da1cd8e55f0371e668dd5dd5af1eb8d71fd))
- **verification/uploads:** support atomic document replacement via existingDocumentId
  ([f98407a](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/f98407a7f60cfcf7691fececf99b6ff86ec50bb4))
- **verification:** import shared filename utility and expand inline comments
  ([a56d8da](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/a56d8da8f3b17d9928ee49fe8c95eaa73babec8f))

### Features

- **accounts:** add accounts admin dashboard page
  ([b8e20ff](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/b8e20ff428d48a0ff3f6dbd05d24395b40dcbee6))
- **accounts:** add delete-user-action component and clean up approve-action comments
  ([a7a1456](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/a7a1456089bbd213ff5b189099753bceeaa79acb))
- **accounts:** add waajiri-accounts-table component
  ([87aa1be](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/87aa1be6045e1226ef6602b613e549fa3449a048))
- **accounts:** introduce wajakazi-accounts-table component and strip inline comments from
  delete-user-action
  ([d984a1f](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/d984a1fea64c8f6fa23f50714b9c334c776ef2f4))
- **admin:** add delete-user API endpoint and clean up staff form comments
  ([ee3f84f](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/ee3f84fd2b6ea728cb275ec5f43868c46db56316))
- **admin:** add vault file API endpoint and update document links to use presigned URLs
  ([6fcf988](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/6fcf988165ad66f33ed8dca57b665ea6a2ef0837))
- **admin:** initialize waajiri accounts route under admin dashboard
  ([a64f93c](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/a64f93cc441dc64ce731d15c26e83aaa98763b87))
- **document-upload-card:** add document replacement flow with file preview support
  ([20f415f](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/20f415fbab11893ccfc5d14d4ff5768805302513))
- **profile:** add photo replacement with cleanup and fix date input formatting
  ([1ab0936](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/1ab093692bb329623637a353c35aa010ad6d41b8))
- **sa:** add pending verification badge and verifications route to super-admin dashboard
  ([bb67251](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/bb6725108dcb6883c6cee0bbe74de7f5eceb569c))
- **sa:** add waajiri and wajakazi account route directories under super-admin accounts
  ([96dbbbc](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/96dbbbcc460528dcd189caa0606eacc5b77f4d3b))

# [1.18.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.17.0...v1.18.0) (2026-04-05)

### Bug Fixes

- **dashboard:** conditionally render second row grid and prevent CTA card stretch
  ([7b2be87](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/7b2be878221d665ac71f85e57584ece64287ca00))

### Features

- **auth:** add role assignment api route and persist intended role across oauth redirects
  ([2aaeaf8](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/2aaeaf8b7efa9a9828377882b9c224c0b619364a))
- **dashboard:** add profile completeness card component for mjakazi workers
  ([8900dde](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/8900ddea5e860c449473663e38c7a5a41fb3b890))
- **profile-form:** expand worker profile form with full field set
  ([9006322](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/90063222a31ab9c37f684fd71126f1d39f187d8b))
- **profile:** add profile constants module
  ([52e6f9b](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/52e6f9b03fe676f8894fa0c3d549a1670a4ca955))
- **profile:** expand wajakazi profile schema with worker attributes
  ([43e3062](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/43e3062bfe144226231581ef5bbbe29df53f6598))

# [1.17.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.16.0...v1.17.0) (2026-04-04)

### Bug Fixes

- **layout:** suppress hydration warning on body element
  ([852c9ea](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/852c9eab72c9a776e18f495d7658ad0c2442c2b7))

### Features

- **dashboard:** add server-side role guards to admin and sa pages
  ([22fa764](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/22fa764340140415036417ca085ff4a1d00a69f5))
- **mjakazi:** add profile, settings, and verification pages with role guard in layout
  ([553cb68](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/553cb6878f99487db9799b9a2d123b99e27dd0fb))
- **mwajiri:** add settings page and delete-account functionality
  ([5626b97](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/5626b97a89a06b6dcfc1be94642aba61a1e04341))
- **sa:** add staff management page and replace create-admin form
  ([36e4187](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/36e4187a2c6d6f17b21381d86cbf6c5a6fa57891))

# [1.16.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.15.0...v1.16.0) (2026-04-01)

### Features

- **profile:** add legal name and display name editing to worker and employer dashboards
  ([fdf9b6b](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/fdf9b6b1c7d0021233261871f7d6a18c306a2428))

# [1.15.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.14.0...v1.15.0) (2026-04-01)

### Bug Fixes

- **api:** set tmp password and legal acceptance on staff creation
  ([7c66499](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/7c66499eaf7b2d1843860204ef57c425afd57aa7))

### Features

- **admin:** add tmp password and legal acceptance to staff creation, remove standalone
  form component
  ([5b37474](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/5b37474791ae19e22262d8234a305b660e5c9089))
- **dashboard:** add dev payment bypass card and refine verification progress UI
  ([870f659](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/870f659155fa0fb65087c4021b877c6914df321c))
- **dashboard:** add functional employer and super admin dashboards with auth gating
  ([6e87aa8](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/6e87aa81340737e098607d6b175314834fe8a3cb))
- **dashboard:** add live pending verification count badge to admin sidebar
  ([72df167](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/72df167a648cb19450b73ffcecbb298aae559aa3))
- **dashboard:** add staff table, delete-staff API, and live staff count to sa dashboard
  ([9091a6c](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/9091a6c85b97aaeb0bebac584764ec20c1e41742))

# [1.14.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.13.0...v1.14.0) (2026-03-29)

### Bug Fixes

- **vault:** add image/jpg to allowed MIME types and improve upload comments
  ([a2fad1c](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/a2fad1ca8608094bf73330fb146c2fed5aa39a4e))

### Features

- **api:** improve document upload handling and vault integration
  ([e392566](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/e39256643ce5f3562753863d1a30159a10e55c26))
- **dashboard:** improve verification flow with status tracking and duplicate prevention
  ([f85752e](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/f85752e3f1344121b010c5e2604aaabdfc6e7f0c))

# [1.13.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.12.0...v1.13.0) (2026-03-26)

### Features

- **prompts:** enhance git commit prompt to enforce conventional commits
  ([7654ff5](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/7654ff5250efb7ba898107e0504c8804c1298318))
- **prompts:** enhance project summary generation with detailed prompt
  ([fc94f42](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/fc94f42a8d7a2a4028710dfb78c982a30f97f887))

# [1.12.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.11.0...v1.12.0) (2026-03-26)

### Bug Fixes

- **inngest:** resolve type mismatch and simplify logic
  ([db5cf3f](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/db5cf3f84c08e7d8e25982853d596b2e1dc829ce))

### Features

- **dashboard:** add verification submission card
  ([5dcdeeb](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/5dcdeebc1ca7eb0273617695ce5f7d7a90806715))
- **ui:** improve document upload card interface
  ([7ced476](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/7ced4766c72a3fb0e98bd0440a03071284625b3d))
- **vault:** restrict image upload mime types
  ([df5aa96](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/df5aa96216233de749a893a27c027c930d785d51))

### Performance Improvements

- **ui:** optimize image sizes attribute
  ([8904fe0](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/8904fe020bb18480a0f19b881a364295c73eb56a))
- **ui:** optimize post hero image loading
  ([b65d097](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/b65d097c6ed9ec1b698d946d82503419618aa6b4))

# [1.11.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.10.1...v1.11.0) (2026-03-17)

### Features

- **dashboard:** implement document upload cards
  ([bdc55bd](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/bdc55bde150817246aab95f5368aa9de55aae81e))
- **dashboard:** implement verification progress component
  ([89d351d](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/89d351d65d27c6a35fca8651a30f0945dbd3ad3e))
- implement dynamic branding and update dev environment
  ([78dbba8](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/78dbba8ad0ace7d463427dc5405564ea8911297c))

## [1.10.1](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.10.0...v1.10.1) (2026-03-15)

### Bug Fixes

- add clear size variant and ref support to button
  ([a3e0fe3](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/a3e0fe3a20fcac830a250d646185e4a0a26a796c))

# [1.10.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.9.0...v1.10.0) (2026-03-15)

### Bug Fixes

- **ui:** update sidebar active state logic
  ([4a20a85](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/4a20a85464148ceeb9d33d0a68f37bfb267727f6))

### Features

- add dashboard layouts and placeholder content for role-based views
  ([11152a5](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/11152a5f13ce0c7644f5d9016cadf96b35283c8a))
- **api:** add verification endpoint
  ([e69aff7](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/e69aff707b6427aec290d51c84e91bc4d390a50c))
- **api:** add verification uploads endpoint
  ([e8bac18](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/e8bac18dfc47beaa3117e13acdbd186b529c3fe1))
- **auth:** add admin and sa dashboard pages and routing
  ([b3afdd6](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/b3afdd6818a7e346961554c5923a01414e19ca24))
- **identity:** add verification status and new api endpoints
  ([692e01d](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/692e01d9d155b2cca8eb5ed2e94a3434ae2b7370))
- implement mjakazi dashboard status and update auth metadata
  ([3cc2d8e](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/3cc2d8e0de80537ab7f3b14a8dedbaa12faccbd6))
- implement mjakazi dashboard verification status
  ([51d94ac](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/51d94ac2dc663c4b0e3b7cec5bba1edfb73248b0))
- **inngest:** integrate inngest and add configuration
  ([60d78fc](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/60d78fc92bc9afa44f758c76fcb979e10870429d))
- **payments:** add payment bypass configuration and api endpoint
  ([3969eac](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/3969eac57eee3b7f1092d6aa6dfe61e8956e73a8))
- redesign authentication layout and style clerk components
  ([ff4c9f9](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/ff4c9f9ce11a1160ca2a0a88e1ab9ae637cf72d7))
- **ui:** add sidebar and update components to unified radix-ui
  ([6624479](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/662447958dae0dde0b0c7cb35584c766749cdb0c))
- **ui:** center saas layout content
  ([4a71c49](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/4a71c49c8023bd4906d6d4401fb2c54f232a221b))
- **vault:** add vault collection for verification documents
  ([7e3485e](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/7e3485e7921ab4da833da2564585974bae74f133))
- **wajakazi-profiles:** expand verification and availability tracking
  ([4f8c400](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/4f8c40021d185779d699a510e32208d2c4653834))
- **wajakazi-profiles:** update verification schema and status options
  ([b6ff2df](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/b6ff2df3cbc57fa2414037d688c2a9e24593f033))

# [1.9.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.8.0...v1.9.0) (2026-03-12)

### Features

- update authentication flow and refine access control logic
  ([eab7c39](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/eab7c39db17e894b691bf037d071e2d059732256))

# [1.8.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.7.0...v1.8.0) (2026-03-12)

### Features

- **auth:** center layout content
  ([28ab959](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/28ab959f791badd3379e350fb9f31dad3c96dc89))

# [1.7.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.6.0...v1.7.0) (2026-03-11)

### Features

- add retry mechanism for identity resolution
  ([c48e1ae](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/c48e1ae8e90b82073294237235841551188df3b1))
- **auth:** add multi-environment support for Clerk webhooks
  ([6f65f30](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/6f65f308c660835857da9ef1045d5eb7371a35a8))
- **auth:** refactor role synchronization and restructure routes
  ([fdfb71e](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/fdfb71eeffa75f2b5db718f31d249ab137d3e1df))
- **collections:** add waajiri-profiles collection
  ([6f71706](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/6f7170662a40c483cdd23542ac96391e181c2ec5))
- **collections:** add wajakazi-profiles and update user requirements
  ([0733bf7](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/0733bf701669d913660fcf553810fc8b0c69aa89))
- **config:** sync waajiri-profiles and update next settings
  ([98cfff9](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/98cfff988a6db0af58000bd03259aeaa035b0227))
- **structure:** initialize api and services directories
  ([b9c4102](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/b9c41025c5e154dfa36c2e00b7c822b26126b016))

# [1.6.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.5.0...v1.6.0) (2026-03-10)

### Features

- **collections:** add accounts collection and update access rules
  ([49a0ef8](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/49a0ef8e9f9a559018547a72fccc9d2c99e70c81))

# [1.5.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.4.0...v1.5.0) (2026-03-05)

### Features

- add blog post detail page and update categories schema
  ([e3216bd](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/e3216bdd90a338a9340a61c8b2515e6522824298))
- add call to action block
  ([50044e8](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/50044e88217ddcf4a4c43147152d69c7f46c36fa))
- add calls-to-action collection
  ([6c91dfb](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/6c91dfb875a8389f67406b6345ce64f40669c1ee))
- add features block and update build memory limit
  ([c0ec108](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/c0ec108b7b346bb49760b79597951a47e0aad00b))
- add how-it-works block and update build memory limit
  ([2189cbb](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/2189cbb437c0f5999408b28b7c13667d244de008))
- add pricing block and update build memory limit
  ([8742a94](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/8742a94d9f010adfcd107e37673f7a07ea4b4e77))
- add testimonials block
  ([08dd353](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/08dd35339c581740b561c36c9fc90930490c7c26))
- add wajakazi-archive block
  ([c9b68b2](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/c9b68b228628d29fc226500c30e6b85e02cd6423))
- **wajakazi-archive:** add headline and description fields
  ([3092674](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/309267431d5c3c313912fb73acb4f51251476f1e))

# [1.4.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.3.0...v1.4.0) (2026-03-04)

### Features

- implement post-auth and role-based sign-up
  ([34b1a85](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/34b1a8582c303d82451a663074a20a37ab519cc5))
- integrate clerk and restructure layout
  ([ad684ae](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/ad684aeb77a313c5594cfc05f0518772f98359eb))

# [1.3.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.2.0...v1.3.0) (2026-03-03)

### Features

- add content editor block to page schema and renderer
  ([c94de96](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/c94de96596b29ffdcdb271898a6141e43b2b1bff))
- add registration block to page schema and renderer
  ([dfe411e](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/dfe411e28b7098516bd1f6557b1eff0c7cf9af95))
- add vertical margin to content editor container
  ([c040d43](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/c040d433b018e46c54c765c4fa1f88d7718256a6))

# [1.2.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.1.0...v1.2.0) (2026-03-03)

### Features

- add hero secondary block and update page schema
  ([bea1d10](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/bea1d10267ff6213f2d209f63c80f8b57b159a5b))
- **blocks:** replace archive block with postsArchive and update fields
  ([7593915](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/75939154bb62101f47c504963846742e789cd209))
- implement primary hero block and update page schema
  ([ba87b9f](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/ba87b9f8931ce69ea93eadda8dc9f8191fd9c41b))

# [1.1.0](https://github.com/m6o4solutions/mjakazi-connect-prod/compare/v1.0.0...v1.1.0) (2026-03-03)

### Features

- implement footer global schema and components
  ([1ac5994](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/1ac5994802ce95f775b33043716c601f5dfb7e79))
- implement header global schema and components
  ([8a2a128](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/8a2a12864a272bc2775111cc78e3a54d3cd724c0))

# 1.0.0 (2026-03-03)

### Features

- allow pdf uploads and simplify media collection schema
  ([0266fe3](https://github.com/m6o4solutions/mjakazi-connect-prod/commit/0266fe33ecff08dac4ef6a50f0486a59a906a9bc))
