<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';

	interface Props {
		user: {
			id: string;
			email: string;
			name: string;
			role: 'admin' | 'member';
		};
		children: Snippet;
	}

	let { user, children }: Props = $props();
	let sidebarOpen = $state(false);

	const navigation = [
		{ name: 'ダッシュボード', href: '/dashboard', icon: 'dashboard' },
		{ name: 'カレンダー', href: '/calendar', icon: 'calendar' },
		{ name: 'プロジェクト', href: '/goals', icon: 'goal' },
		{ name: 'レビュー一覧', href: '/reviews', icon: 'reviews' },
		{ name: '新規依頼', href: '/reviews/new', icon: 'add' }
	];

	const adminNavigation = [
		{ name: 'メンバー管理', href: '/members', icon: 'users' },
		{ name: '設定', href: '/settings', icon: 'settings' }
	];

	function isActive(href: string): boolean {
		const currentPath = $page.url.pathname;
		// Exact match for these paths
		if (href === '/dashboard' || href === '/reviews' || href === '/reviews/new' || href === '/members' || href === '/settings' || href === '/calendar' || href === '/goals') {
			return currentPath === href;
		}
		// For detail pages like /reviews/[id], highlight the reviews link
		if (href === '/reviews' && currentPath.startsWith('/reviews/') && currentPath !== '/reviews/new') {
			return true;
		}
		// For detail pages like /goals/[id], highlight the goals link
		if (href === '/goals' && currentPath.startsWith('/goals/') && currentPath !== '/goals/new') {
			return true;
		}
		return currentPath.startsWith(href);
	}
</script>

<div class="min-h-screen bg-slate-50">
	<!-- Mobile sidebar backdrop -->
	{#if sidebarOpen}
		<div
			class="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
			onclick={() => sidebarOpen = false}
			onkeydown={(e) => e.key === 'Escape' && (sidebarOpen = false)}
			role="button"
			tabindex="0"
		></div>
	{/if}

	<!-- Sidebar -->
	<aside
		class="fixed top-0 left-0 z-50 h-full w-64 bg-gradient-to-b from-slate-900 to-slate-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 {sidebarOpen ? 'translate-x-0' : '-translate-x-full'}"
	>
		<!-- Logo -->
		<div class="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50">
			<div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
				<svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			</div>
			<div>
				<h1 class="text-white font-bold text-lg">レビュー管理</h1>
				<p class="text-slate-400 text-xs">社内チェックシステム</p>
			</div>
		</div>

		<!-- Navigation -->
		<nav class="px-3 py-4 space-y-1">
			<p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">メイン</p>
			{#each navigation as item}
				<a
					href={item.href}
					class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
						{isActive(item.href)
							? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
							: 'text-slate-300 hover:bg-slate-700/50 hover:text-white'}"
				>
					{#if item.icon === 'dashboard'}
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
						</svg>
					{:else if item.icon === 'calendar'}
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
					{:else if item.icon === 'goal'}
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
						</svg>
					{:else if item.icon === 'reviews'}
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
						</svg>
					{:else if item.icon === 'add'}
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					{/if}
					{item.name}
				</a>
			{/each}

			{#if user.role === 'admin'}
				<p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-2">管理</p>
				{#each adminNavigation as item}
					<a
						href={item.href}
						class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
							{isActive(item.href)
								? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
								: 'text-slate-300 hover:bg-slate-700/50 hover:text-white'}"
					>
						{#if item.icon === 'users'}
							<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
							</svg>
						{:else if item.icon === 'settings'}
							<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
						{/if}
						{item.name}
					</a>
				{/each}
			{/if}
		</nav>

		<!-- User section at bottom -->
		<div class="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50">
			<div class="flex items-center gap-3 px-2">
				<div class="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
					{user.name.charAt(0)}
				</div>
				<div class="flex-1 min-w-0">
					<p class="text-sm font-medium text-white truncate">{user.name}</p>
					<p class="text-xs text-slate-400 truncate">{user.email}</p>
				</div>
				<form method="POST" action="/logout">
					<button
						type="submit"
						class="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
						title="ログアウト"
					>
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
						</svg>
					</button>
				</form>
			</div>
		</div>
	</aside>

	<!-- Main content area -->
	<div class="lg:pl-64">
		<!-- Top header -->
		<header class="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
			<div class="flex items-center justify-between px-4 py-3 lg:px-8">
				<!-- Mobile menu button -->
				<button
					type="button"
					class="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
					onclick={() => sidebarOpen = true}
				>
					<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>

				<!-- Breadcrumb / Page title area (can be customized) -->
				<div class="hidden lg:block"></div>

				<!-- Right side actions -->
				<div class="flex items-center gap-3">
					<!-- Notifications placeholder -->
					<button class="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg relative">
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
						</svg>
						<span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
					</button>

					<!-- User badge (mobile) -->
					<div class="lg:hidden flex items-center gap-2 pl-2 border-l border-slate-200">
						<div class="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
							{user.name.charAt(0)}
						</div>
					</div>
				</div>
			</div>
		</header>

		<!-- Page content -->
		<main class="p-4 lg:p-8">
			{@render children()}
		</main>
	</div>
</div>
