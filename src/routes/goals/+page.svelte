<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const statusLabels: Record<string, string> = {
		pending: '未着手',
		in_progress: '進行中',
		completed: '完了',
		on_hold: '保留'
	};

	const statusColors: Record<string, string> = {
		pending: 'bg-slate-100 text-slate-600 border border-slate-300',
		in_progress: 'bg-blue-100 text-blue-800',
		completed: 'bg-green-100 text-green-800',
		on_hold: 'bg-yellow-100 text-yellow-800'
	};

	const priorityLabels: Record<string, string> = {
		high: '高',
		medium: '中',
		low: '低'
	};

	const priorityColors: Record<string, string> = {
		high: 'bg-red-100 text-red-800',
		medium: 'bg-yellow-100 text-yellow-800',
		low: 'bg-gray-100 text-gray-600'
	};

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function isOverdue(dateStr: string): boolean {
		return new Date(dateStr) < new Date();
	}

	let searchInput = $state(data.search);
	let deletingId = $state<string | null>(null);
	let copiedId = $state<string | null>(null);

	async function deleteGoal(goalId: string, title: string) {
		if (!confirm(`「${title}」を削除しますか？この操作は取り消せません。`)) {
			return;
		}

		deletingId = goalId;
		try {
			const res = await fetch(`/api/goals/${goalId}`, { method: 'DELETE' });
			const result = await res.json();

			if (result.success) {
				window.location.reload();
			} else {
				alert(result.error || '削除に失敗しました');
			}
		} catch (err) {
			alert('削除に失敗しました');
		} finally {
			deletingId = null;
		}
	}

	async function copyLink(goalId: string) {
		const url = `${window.location.origin}/goals/${goalId}`;
		await navigator.clipboard.writeText(url);
		copiedId = goalId;
		setTimeout(() => copiedId = null, 2000);
	}
</script>

<AppLayout user={data.user}>
	<div class="px-4 sm:px-0">
		<div class="flex items-center justify-between mb-6">
			<h1 class="text-2xl font-bold text-rose-900">プロジェクト一覧</h1>
			<a
				href="/goals/new"
				class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-rose-600 hover:bg-rose-700"
			>
				新規作成
			</a>
		</div>

		<!-- Filters -->
		<div class="bg-white shadow rounded-lg p-4 mb-6">
			<form method="GET" class="flex flex-wrap gap-4 items-end">
				<div>
					<label for="filter" class="block text-sm font-medium text-gray-700 mb-1">
						表示
					</label>
					<select
						id="filter"
						name="filter"
						class="block w-40 px-3 py-2 border border-gray-300 rounded-md"
						value={data.filter}
					>
						<option value="all">すべて</option>
						<option value="assigned">担当中</option>
						<option value="created">作成したもの</option>
					</select>
				</div>

				<div>
					<label for="status" class="block text-sm font-medium text-gray-700 mb-1">
						ステータス
					</label>
					<select
						id="status"
						name="status"
						class="block w-32 px-3 py-2 border border-gray-300 rounded-md"
						value={data.status}
					>
						<option value="all">すべて</option>
						<option value="pending">未着手</option>
						<option value="in_progress">進行中</option>
						<option value="completed">完了</option>
						<option value="on_hold">保留</option>
					</select>
				</div>

				<div>
					<label for="sort" class="block text-sm font-medium text-gray-700 mb-1">
						並び順
					</label>
					<select
						id="sort"
						name="sort"
						class="block w-36 px-3 py-2 border border-gray-300 rounded-md"
						value={data.sort || 'newest'}
					>
						<option value="newest">新しい順</option>
						<option value="oldest">古い順</option>
						<option value="due_date">期限順</option>
						<option value="status">ステータス順</option>
					</select>
				</div>

				<div class="flex-1">
					<label for="search" class="block text-sm font-medium text-gray-700 mb-1">
						検索
					</label>
					<input
						type="text"
						id="search"
						name="search"
						placeholder="タイトルで検索..."
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

		<!-- Goal List (カード形式) -->
		<div class="bg-white shadow rounded-xl overflow-hidden border border-rose-200">
			<div class="px-4 sm:px-6 py-3 border-b border-rose-100 flex items-center justify-between bg-rose-50">
				<h2 class="font-semibold text-rose-700 text-sm flex items-center gap-2">
					🎯 プロジェクト
					<span class="text-xs font-normal text-rose-500">{data.goals.length}件</span>
				</h2>
			</div>
			{#if data.goals.length > 0}
				<div class="p-2 sm:p-3 space-y-2">
					{#each data.goals as goal}
						<div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50/50 hover:bg-rose-100/50 transition-colors">
							<!-- カラーアイコン -->
							<div class="shrink-0">
								<span class="w-5 h-5 rounded-full block" style="background-color: {goal.color}"></span>
							</div>
							<!-- タイトル・情報 -->
							<div class="flex-1 min-w-0">
								<a href="/goals/{goal.id}" class="block text-sm font-medium text-rose-600 hover:text-rose-800 hover:underline truncate">
									{goal.title}
								</a>
								<div class="flex items-center gap-2 mt-1 flex-wrap">
									<span class="px-2 py-0.5 text-xs rounded-full {statusColors[goal.status]}">
										{statusLabels[goal.status]}
									</span>
									<span class="px-2 py-0.5 text-xs rounded-full {priorityColors[goal.priority]}">
										優先度: {priorityLabels[goal.priority]}
									</span>
									<span class="text-xs text-slate-400">{goal.creator_name}</span>
									<span class="text-xs text-slate-400" title="作成日">
										作成: {formatDate(goal.created_at)}
									</span>
									<span class="text-xs {goal.status !== 'completed' && isOverdue(goal.due_date) ? 'text-red-600 font-medium' : 'text-slate-400'}" title="期限">
										期限: {formatDate(goal.due_date)}
									</span>
									{#if goal.total_reviews > 0}
										<span class="text-xs text-slate-400">
											進捗: {goal.completed_reviews}/{goal.total_reviews}
										</span>
									{/if}
								</div>
							</div>
							<!-- アクションボタン -->
							<div class="flex items-center gap-1.5 shrink-0">
								<a
									href="/goals/{goal.id}"
									class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
									title="開く"
								>
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								</a>
								<button
									type="button"
									onclick={() => copyLink(goal.id)}
									class="p-1.5 rounded-lg transition-colors {copiedId === goal.id ? 'bg-green-100 text-green-700' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}"
									title="リンクをコピー"
								>
									{#if copiedId === goal.id}
										<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
									{:else}
										<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
										</svg>
									{/if}
								</button>
								<button
									type="button"
									onclick={() => deleteGoal(goal.id, goal.title)}
									disabled={deletingId === goal.id}
									class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
									title="削除"
								>
									{#if deletingId === goal.id}
										<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
											<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
											<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
									{:else}
										<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									{/if}
								</button>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="px-6 py-8 text-center text-gray-500">
					プロジェクトが見つかりません
				</div>
			{/if}
		</div>
	</div>
</AppLayout>
