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

	const navItems = [
		{ href: '/goals', label: 'プロジェクト', icon: '🎯' },
		{ href: '/reviews', label: 'ドキュメント', icon: '📋' },
		{ href: '/calendar', label: 'カレンダー', icon: '📅' },
	];

	const adminItems = [
		{ href: '/members', label: 'メンバー管理', icon: '👥' },
		{ href: '/settings', label: '設定', icon: '⚙️' },
	];

	// 外部システムリンク
	const systemLinks = [
		{
			href: 'https://webthqui.pages.dev',
			label: 'ストレスチェック',
			description: '分析システム',
			icon: '📊',
			color: 'from-emerald-500 to-teal-600'
		},
		{
			href: 'https://sougoushinrimake.pages.dev',
			label: 'MAツール',
			description: 'LP/ブログ/PR作成',
			icon: '🚀',
			color: 'from-purple-500 to-indigo-600'
		},
	];
</script>

<div class="min-h-screen bg-slate-50">
	<!-- Mobile sidebar backdrop -->
	{#if sidebarOpen}
		<div class="fixed inset-0 bg-black/50 z-40 lg:hidden" onclick={() => sidebarOpen = false}></div>
	{/if}

	<!-- Sidebar -->
	<aside class="fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 transform transition-transform lg:translate-x-0 {sidebarOpen ? 'translate-x-0' : '-translate-x-full'}">
		<!-- Logo -->
		<div class="h-16 flex items-center px-6 border-b border-slate-200">
			<a href="/goals" class="flex items-center gap-3">
				<div class="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
					<svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<span class="text-slate-900 font-bold text-lg">チェック管理</span>
			</a>
		</div>

		<!-- Navigation -->
		<nav class="p-4 space-y-1">
			{#each navItems as item}
				<a
					href={item.href}
					class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors {$page.url.pathname.startsWith(item.href) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
				>
					<span class="text-xl">{item.icon}</span>
					<span class="font-medium">{item.label}</span>
				</a>
			{/each}

			{#if user.role === 'admin'}
				<div class="pt-4 mt-4 border-t border-slate-200">
					<p class="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">管理</p>
					{#each adminItems as item}
						<a
							href={item.href}
							class="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors {$page.url.pathname.startsWith(item.href) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}"
						>
							<span class="text-xl">{item.icon}</span>
							<span class="font-medium">{item.label}</span>
						</a>
					{/each}
				</div>
			{/if}

			<!-- システムリンク -->
			<div class="pt-4 mt-4 border-t border-slate-200">
				<p class="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">システム</p>
				<div class="space-y-2 px-2">
					{#each systemLinks as link}
						<a
							href={link.href}
							target="_blank"
							rel="noopener noreferrer"
							class="block p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all group bg-white"
						>
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 bg-gradient-to-br {link.color} rounded-lg flex items-center justify-center text-xl shadow-sm">
									{link.icon}
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{link.label}</p>
									<p class="text-xs text-slate-500 truncate">{link.description}</p>
								</div>
								<svg class="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
								</svg>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</nav>

		<!-- User info at bottom -->
		<div class="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold">
					{user.name.charAt(0)}
				</div>
				<div class="flex-1 min-w-0">
					<p class="text-sm font-medium text-slate-900 truncate">{user.name}</p>
					<p class="text-xs text-slate-500 truncate">{user.email}</p>
				</div>
				<form method="POST" action="/logout">
					<button
						type="submit"
						class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
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
	<div class="lg:ml-64">
		<!-- Mobile header -->
		<header class="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm lg:hidden">
			<div class="px-4 py-3 flex items-center justify-between">
				<button
					type="button"
					onclick={() => sidebarOpen = true}
					class="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
				>
					<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
				<span class="font-bold text-slate-900">チェック管理</span>
				<div class="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
					{user.name.charAt(0)}
				</div>
			</div>
		</header>

		<!-- Page content -->
		<main class="p-4 lg:p-8">
			{@render children()}
		</main>
	</div>
</div>
