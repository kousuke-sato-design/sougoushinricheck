<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchInput = $state(data.search);

	const actionConfig: Record<string, { label: string; emoji: string; bg: string; ring: string }> = {
		comment: { label: 'コメント', emoji: '💬', bg: 'bg-gradient-to-r from-sky-500 to-indigo-500', ring: 'ring-sky-200' },
		approved: { label: '承認', emoji: '✅', bg: 'bg-gradient-to-r from-emerald-500 to-teal-500', ring: 'ring-emerald-200' },
		rejected: { label: '差し戻し', emoji: '⛔', bg: 'bg-gradient-to-r from-rose-500 to-pink-500', ring: 'ring-rose-200' }
	};

	const userColors = [
		'from-pink-500 to-rose-500',
		'from-amber-500 to-orange-500',
		'from-lime-500 to-emerald-500',
		'from-cyan-500 to-sky-500',
		'from-violet-500 to-purple-500',
		'from-fuchsia-500 to-pink-500'
	];

	function userColor(name: string): string {
		if (!name) return userColors[0];
		let h = 0;
		for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
		return userColors[h % userColors.length];
	}

	function formatDateTime(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);
		if (minutes < 1) return 'たった今';
		if (minutes < 60) return `${minutes}分前`;
		if (hours < 24) return `${hours}時間前`;
		if (days < 7) return `${days}日前`;
		return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	function truncate(text: string, n: number): string {
		if (!text) return '';
		return text.length > n ? text.slice(0, n) + '…' : text;
	}

	function firstChar(name: string): string {
		if (!name) return '?';
		return name.charAt(0);
	}
</script>

<AppLayout user={data.user}>
	<div class="px-4 sm:px-0">
		<!-- Header -->
		<div class="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-8 shadow-xl">
			<div class="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl"></div>
			<div class="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>
			<div class="relative flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-white flex items-center gap-3">
						<span class="text-4xl">💬</span>
						コメント一覧
					</h1>
					<p class="mt-1 text-sm text-indigo-100">
						どのプロジェクトのどのドキュメントに、誰がコメントしたかが一目でわかります
					</p>
				</div>
				<div class="hidden sm:flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 backdrop-blur-sm">
					<span class="text-2xl font-bold text-white">{data.comments.length}</span>
					<span class="text-sm text-indigo-100">件</span>
				</div>
			</div>
		</div>

		<!-- Filters -->
		<div class="bg-white shadow-md rounded-xl p-4 mb-6 border border-slate-100">
			<form method="GET" class="flex flex-wrap gap-3 items-end">
				<div>
					<label for="project" class="block text-xs font-semibold text-slate-600 mb-1">
						🎯 プロジェクト
					</label>
					<select
						id="project"
						name="project"
						class="block w-48 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
						value={data.projectId}
					>
						<option value="">すべて</option>
						<option value="none">未紐付け</option>
						{#each data.projects as p}
							<option value={p.id}>{p.title}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="sort" class="block text-xs font-semibold text-slate-600 mb-1">
						⏱️ 並び順
					</label>
					<select
						id="sort"
						name="sort"
						class="block w-32 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
						value={data.sort}
					>
						<option value="newest">新しい順</option>
						<option value="oldest">古い順</option>
					</select>
				</div>

				<div class="flex-1 min-w-[200px]">
					<label for="search" class="block text-xs font-semibold text-slate-600 mb-1">
						🔍 検索
					</label>
					<input
						type="text"
						id="search"
						name="search"
						placeholder="本文・ドキュメント・プロジェクトで検索..."
						class="block w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
						bind:value={searchInput}
					/>
				</div>

				<button
					type="submit"
					class="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-lg shadow-md hover:shadow-lg hover:from-indigo-600 hover:to-purple-600 transition-all"
				>
					絞り込み
				</button>
			</form>
		</div>

		<!-- Comment Cards -->
		{#if data.comments.length > 0}
			<div class="grid gap-3">
				{#each data.comments as c}
					{@const action = actionConfig[c.action_type || 'comment'] || actionConfig.comment}
					{@const projectColor = c.goal_color || '#94a3b8'}
					<a
						href="/reviews/{c.review_id}"
						class="group relative block bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden border border-slate-100 hover:-translate-y-0.5"
					>
						<!-- 左側カラーバー (プロジェクト色) -->
						<div
							class="absolute left-0 top-0 bottom-0 w-1.5"
							style="background: linear-gradient(180deg, {projectColor}, {projectColor}aa)"
						></div>

						<div class="pl-5 pr-4 sm:pl-7 sm:pr-6 py-4">
							<!-- 上段: プロジェクト + ドキュメント + アクション -->
							<div class="flex items-start justify-between gap-3 mb-3">
								<div class="flex-1 min-w-0">
									<!-- プロジェクトバッジ -->
									<div class="flex items-center gap-2 mb-1.5 flex-wrap">
										{#if c.goal_id}
											<span
												class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow-sm"
												style="background-color: {projectColor}"
											>
												🎯 {c.goal_title}
											</span>
										{:else}
											<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
												📎 未紐付け
											</span>
										{/if}
										<span class="text-slate-300">›</span>
										<span class="inline-flex items-center gap-1 text-sm font-bold text-slate-800 truncate">
											📋 {c.review_title}
										</span>
									</div>
								</div>

								<!-- アクションバッジ -->
								<span class="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white shadow-md {action.bg}">
									<span>{action.emoji}</span>
									<span>{action.label}</span>
								</span>
							</div>

							<!-- 中段: ユーザーアバター + 本文 -->
							<div class="flex items-start gap-3">
								<!-- アバター -->
								<div class="shrink-0">
									<div class="w-10 h-10 rounded-full bg-gradient-to-br {userColor(c.user_name || c.guest_name || '')} flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white">
										{firstChar(c.user_name || c.guest_name || '?')}
									</div>
								</div>

								<!-- 本文 -->
								<div class="flex-1 min-w-0">
									<div class="flex items-baseline gap-2 mb-1 flex-wrap">
										<span class="text-sm font-semibold text-slate-900">
											{c.user_name || c.guest_name || 'ゲスト'}
										</span>
										{#if !c.user_name && c.guest_name}
											<span class="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">ゲスト</span>
										{/if}
										<span class="text-xs text-slate-400">
											{formatDateTime(c.created_at)}
										</span>
									</div>
									<p class="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
										{truncate(c.content, 240)}
									</p>
								</div>
							</div>

							<!-- 右矢印 (ホバー時) -->
							<div class="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
								<div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg">
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
									</svg>
								</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div class="bg-white rounded-2xl shadow-sm border border-slate-100 px-6 py-16 text-center">
				<div class="text-6xl mb-4">💭</div>
				<p class="text-slate-500 font-medium">コメントはまだありません</p>
				<p class="text-xs text-slate-400 mt-1">ドキュメントにコメントするとここに表示されます</p>
			</div>
		{/if}
	</div>
</AppLayout>
