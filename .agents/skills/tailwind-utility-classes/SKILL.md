---
name: tailwind-utility-classes
user-invocable: false
description:
  Use when working with Tailwind CSS utility classes for layout, spacing, typography,
  colors, and visual effects. Covers utility-first CSS patterns and class composition.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---

# Tailwind CSS - Utility Classes

Tailwind CSS is a utility-first CSS framework that provides low-level utility classes to
build custom designs without leaving your HTML.

## Key Concepts

### Utility-First Approach

Instead of writing custom CSS, compose designs using pre-built utility classes:

```html
<!-- Traditional CSS -->
<style>
	.btn {
		background-color: #3b82f6;
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
	}
</style>
<button class="btn">Click me</button>

<!-- Tailwind utility-first -->
<button class="rounded bg-blue-500 px-4 py-2 text-white">Click me</button>
```

### Core Utility Categories

#### Layout

- **Display**: `block`, `inline-block`, `flex`, `grid`, `hidden`
- **Position**: `static`, `relative`, `absolute`, `fixed`, `sticky`
- **Flexbox**: `flex-row`, `flex-col`, `justify-center`, `items-center`, `gap-4`
- **Grid**: `grid-cols-3`, `grid-rows-2`, `col-span-2`, `row-span-1`

#### Spacing

- **Padding**: `p-4`, `px-2`, `py-6`, `pt-8`, `pr-3`, `pb-2`, `pl-1`
- **Margin**: `m-4`, `mx-auto`, `my-6`, `-mt-4` (negative margins)
- **Space Between**: `space-x-4`, `space-y-2`

#### Typography

- **Font Family**: `font-sans`, `font-serif`, `font-mono`
- **Font Size**: `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`,
  `text-3xl`
- **Font Weight**: `font-thin`, `font-normal`, `font-medium`, `font-semibold`, `font-bold`
- **Text Color**: `text-gray-900`, `text-blue-500`, `text-red-600`
- **Text Alignment**: `text-left`, `text-center`, `text-right`, `text-justify`
- **Line Height**: `leading-none`, `leading-tight`, `leading-normal`, `leading-relaxed`

#### Colors & Backgrounds

- **Background Color**: `bg-white`, `bg-gray-100`, `bg-blue-500`
- **Background Gradient**: `bg-gradient-to-r from-blue-500 to-purple-600`
- **Opacity**: `opacity-0`, `opacity-50`, `opacity-100`

#### Borders & Shadows

- **Border**: `border`, `border-2`, `border-t`, `border-gray-300`
- **Border Radius**: `rounded`, `rounded-lg`, `rounded-full`, `rounded-none`
- **Box Shadow**: `shadow-sm`, `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl`
- **Ring**: `ring-2`, `ring-blue-500`, `ring-offset-2`

#### Effects

- **Transitions**: `transition`, `transition-all`, `duration-300`, `ease-in-out`
- **Transforms**: `scale-110`, `rotate-45`, `translate-x-4`, `skew-y-3`
- **Filters**: `blur-sm`, `brightness-50`, `contrast-125`, `grayscale`

## Best Practices

### 1. Responsive Design with Breakpoints

Use responsive prefixes for different screen sizes:

```html
<!-- Mobile-first: stack vertically on small screens, horizontal on medium+ -->
<div class="flex flex-col gap-4 md:flex-row">
	<div class="w-full md:w-1/2">Column 1</div>
	<div class="w-full md:w-1/2">Column 2</div>
</div>

<!-- Responsive text sizes -->
<h1 class="text-2xl md:text-4xl lg:text-6xl">Responsive Heading</h1>
```

Breakpoints:

- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px
- `2xl:` - 1536px

### 2. State Variants

Apply utilities based on state:

```html
<!-- Hover, focus, active states -->
<button
	class="rounded bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 active:scale-95"
>
	Interactive Button
</button>

<!-- Group hover -->
<div class="group">
	<img class="transition group-hover:scale-110" src="..." />
	<p class="text-gray-600 group-hover:text-blue-500">Hover the parent</p>
</div>
```

### 3. Dark Mode

Use `dark:` prefix for dark mode styles:

```html
<div
	class="border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
>
	Dark mode compatible content
</div>
```

### 4. Arbitrary Values

Use square brackets for one-off custom values:

```html
<!-- Custom spacing -->
<div class="mt-[17px] p-[13px]">
	<!-- Custom colors -->
	<div class="bg-[#1da1f2] text-[rgb(255,100,50)]">
		<!-- Custom breakpoints -->
		<div class="min-[890px]:flex"></div>
	</div>
</div>
```

### 5. Class Organization

Order classes logically for readability:

```html
<!-- Layout → Spacing → Typography → Colors → Effects -->
<div
	class="flex items-center justify-between rounded-lg bg-white px-6 py-4 text-lg font-semibold text-gray-900 shadow-md transition hover:shadow-xl"
></div>
```

## Examples

### Card Component

```html
<div
	class="mx-auto max-w-sm overflow-hidden rounded-lg bg-white shadow-md transition-shadow duration-300 hover:shadow-xl"
>
	<img class="h-48 w-full object-cover" src="/image.jpg" alt="Card image" />
	<div class="p-6">
		<h2 class="mb-2 text-2xl font-bold text-gray-900">Card Title</h2>
		<p class="mb-4 leading-relaxed text-gray-600">
			Card description goes here with some helpful information.
		</p>
		<button
			class="w-full rounded bg-blue-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-600"
		>
			Learn More
		</button>
	</div>
</div>
```

### Responsive Navigation

```html
<nav class="border-b border-gray-200 bg-white shadow-lg">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 items-center justify-between">
			<!-- Logo -->
			<div class="flex-shrink-0">
				<h1 class="text-2xl font-bold text-blue-600">Logo</h1>
			</div>

			<!-- Desktop Navigation -->
			<div class="hidden space-x-8 md:flex">
				<a
					href="#"
					class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:text-blue-600"
				>
					Home
				</a>
				<a
					href="#"
					class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:text-blue-600"
				>
					About
				</a>
				<a
					href="#"
					class="rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:text-blue-600"
				>
					Contact
				</a>
			</div>

			<!-- Mobile menu button -->
			<div class="md:hidden">
				<button class="p-2 text-gray-700 hover:text-blue-600">
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				</button>
			</div>
		</div>
	</div>
</nav>
```

### Grid Layout

```html
<div class="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
	<div class="rounded-lg bg-white p-6 shadow">Item 1</div>
	<div class="rounded-lg bg-white p-6 shadow">Item 2</div>
	<div class="rounded-lg bg-white p-6 shadow">Item 3</div>
	<div class="col-span-1 rounded-lg bg-white p-6 shadow md:col-span-2">Wide Item</div>
	<div class="rounded-lg bg-white p-6 shadow">Item 5</div>
</div>
```

## Common Patterns

### Centering Content

```html
<!-- Flexbox centering -->
<div class="flex min-h-screen items-center justify-center">
	<div>Centered content</div>
</div>

<!-- Grid centering -->
<div class="grid min-h-screen place-items-center">
	<div>Centered content</div>
</div>

<!-- Absolute centering -->
<div class="relative h-screen">
	<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
		Centered content
	</div>
</div>
```

### Truncating Text

```html
<!-- Single line truncate -->
<p class="truncate">This text will be truncated with an ellipsis if it's too long</p>

<!-- Multi-line truncate -->
<p class="line-clamp-3">This text will be truncated after 3 lines with an ellipsis</p>
```

### Aspect Ratios

```html
<!-- 16:9 aspect ratio -->
<div class="aspect-video bg-gray-200">
	<iframe src="..." class="h-full w-full"></iframe>
</div>

<!-- Square aspect ratio -->
<div class="aspect-square bg-gray-200">
	<img src="..." class="h-full w-full object-cover" />
</div>
```

## Anti-Patterns

### ❌ Don't Use Inline Styles

```html
<!-- Bad: Mixing inline styles with Tailwind -->
<div class="p-4" style="margin-top: 20px;">Content</div>

<!-- Good: Use Tailwind utilities -->
<div class="mt-5 p-4">Content</div>
```

### ❌ Don't Create Unnecessary Wrapper Divs

```html
<!-- Bad: Extra wrapper for centering -->
<div class="flex justify-center">
	<div class="text-center">
		<h1>Title</h1>
	</div>
</div>

<!-- Good: Direct styling -->
<h1 class="text-center">Title</h1>
```

### ❌ Don't Overuse Arbitrary Values

```html
<!-- Bad: Too many custom values -->
<div class="mt-[17px] mb-[23px] pt-[11px] pb-[19px]">
	<!-- Good: Use standard spacing scale -->
	<div class="my-6 py-3"></div>
</div>
```

### ❌ Don't Forget Mobile-First

```html
<!-- Bad: Desktop-first approach -->
<div class="w-1/2 sm:w-full">
	<!-- Good: Mobile-first approach -->
	<div class="w-full sm:w-1/2"></div>
</div>
```

## Related Skills

- **tailwind-configuration**: Customizing Tailwind config and theme
- **tailwind-components**: Building reusable component patterns
- **tailwind-responsive-design**: Advanced responsive design techniques
- **tailwind-performance**: Optimizing Tailwind for production
