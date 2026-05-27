<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchInput = $state(data.search);

	const actionLabels: Record<string, string> = {
		comment: '💬 コメント',
		approved: '✅ 承認',
		rejected: '⛔ 差し戻し'
	};

	const actionColors: Record<string, string> = {
		comment: 'bg-slate-100 text-slate-700',
		approved: 'bg-emerald-100 text-emerald-700',
		rejected: 'bg-red-100 text-red-700'
	};

	function formatDateTime(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function truncate(text: string, n: number): string {
		if (!text) return '';
		return text.length > n ? text.slice(0, n) + '…' : text;
	}
</script>

<AppLayout user={data.user}>
	<div class="px-4 sm:px-0">
		<div class="flex items-center justify-between mb-6">
			<h1 class="text-2xl font-bold text-slate-900">コメント一覧</h1>
			<span class="text-sm text-slate-500">{data.comments.length}件</span>
		</div>

		<!-- Filters -->
		<div class="bg-white shadow rounded-lg p-4 mb-6">
			<form method="GET" class="flex flex-wrap gap-4 items-end">
				<div>
					<label for="project" class="block text-sm font-medium text-gray-700 mb-1">
						プロジェクト
					</label>
					<select
						id="project"
						name="project"
						class="block w-48 px-3 py-2 border border-gray-300 rounded-md"
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
					<label for="sort" class="block text-sm font-medium text-gray-700 mb-1">
						並び順
					</label>
					<select
						id="sort"
						name="sort"
						class="block w-32 px-3 py-2 border border-gray-300 rounded-md"
						value={data.sort}
					>
						<option value="newest">新しい順</option>
						<option value="oldest">古い順</option>
					</select>
				</div>

				<div class="flex-1 min-w-[200px]">
					<label for="search" class="block text-sm font-medium text-gray-700 mb-1">
						検索
					</label>
					<input
						type="text"
						id="search"
						name="search"
						placeholder="コメント・ドキュメント・プロジェクトで検索..."
						class="block w-full px-3 py-2 border border-gray-300 rounded-md"
						bind:value={searchInput}
					/>
				</div>

				<button
					type="submit"
					class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
				>
					絞り込み
				</button>
			</form>
		</div>

		<!-- Comment List -->
		<div class="bg-white shadow rounded-xl overflow-hidden border border-slate-200">
			<div class="px-4 sm:px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
				<h2 class="font-semibold text-slate-700 text-sm flex items-center gap-2">
					💬 コメント
					<span class="text-xs font-normal text-slate-500">{data.comments.length}件</span>
				</h2>
			</div>

			{#if data.comments.length > 0}
				<ul class="divide-y divide-slate-100">
					{#each data.comments as c}
						<li>
							<a
								href="/reviews/{c.review_id}"
								class="flex flex-col sm:flex-row sm:items-start gap-3 px-4 sm:px-6 py-4 hover:bg-slate-50 transition-colors"
							>
								<!-- カラードット & プロジェクト / ドキュメント -->
								<div class="shrink-0 sm:w-64 flex sm:flex-col items-center sm:items-start gap-2 sm:gap-1">
									<div class="flex items-center gap-2 min-w-0">
										{#if c.goal_id}
											<span
												class="w-3 h-3 rounded-full shrink-0"
												style="background-color: {c.goal_color}"
												title="プロジェクト"
											></span>
											<span class="text-xs font-medium text-rose-700 truncate">
												🎯 {c.goal_title}
											</span>
										{:else}
											<span class="w-3 h-3 rounded-full shrink-0 bg-slate-300"></span>
											<span class="text-xs font-medium text-slate-400 truncate">
												未紐付け
											</span>
										{/if}
									</div>
									<div class="text-sm font-semibold text-slate-800 truncate" title={c.review_title}>
										📋 {c.review_title}
									</div>
								</div>

								<!-- コメント本文 -->
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-1 flex-wrap">
										<span class="px-2 py-0.5 text-xs rounded-full {actionColors[c.action_type || 'comment']}">
											{actionLabels[c.action_type || 'comment']}
										</span>
										<span class="text-xs font-medium text-slate-600">
											{c.user_name || c.guest_name || 'ゲスト'}
										</span>
										<span class="text-xs text-slate-400">
											{formatDateTime(c.created_at)}
										</span>
									</div>
									<p class="text-sm text-slate-700 whitespace-pre-wrap break-words">
										{truncate(c.content, 200)}
									</p>
								</div>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="px-6 py-12 text-center text-slate-500 text-sm">
					コメントはまだありません
				</div>
			{/if}
		</div>
	</div>
</AppLayout>
