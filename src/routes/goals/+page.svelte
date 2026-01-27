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
		pending: 'bg-gray-100 text-gray-800',
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

	function getProgress(completed: number, total: number): number {
		if (total === 0) return 0;
		return Math.round((completed / total) * 100);
	}

	let searchInput = $state(data.search);
</script>

<AppLayout user={data.user}>
	<div class="px-4 sm:px-0">
		<div class="flex items-center justify-between mb-6">
			<h1 class="text-2xl font-bold text-gray-900">プロジェクト一覧</h1>
			<a
				href="/goals/new"
				class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
			>
				新規プロジェクト
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

		<!-- Goal List -->
		<div class="grid gap-4">
			{#each data.goals as goal}
				<a
					href="/goals/{goal.id}"
					class="block bg-white shadow rounded-lg p-5 hover:shadow-md transition-shadow border-l-4"
					style="border-left-color: {goal.color}"
				>
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-3 mb-2">
								<h2 class="text-lg font-semibold text-gray-900">{goal.title}</h2>
								<span class="px-2 py-0.5 text-xs rounded-full {statusColors[goal.status]}">
									{statusLabels[goal.status]}
								</span>
								<span class="px-2 py-0.5 text-xs rounded-full {priorityColors[goal.priority]}">
									{priorityLabels[goal.priority]}
								</span>
							</div>
							{#if goal.description}
								<p class="text-sm text-gray-600 mb-3 line-clamp-2">{goal.description}</p>
							{/if}
							<div class="flex items-center gap-4 text-sm text-gray-500">
								<span class="flex items-center gap-1">
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
									<span class:text-red-600={goal.status !== 'completed' && isOverdue(goal.due_date)}>
										{formatDate(goal.due_date)}
									</span>
								</span>
								<span class="flex items-center gap-1">
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
									{goal.creator_name}
								</span>
								{#if goal.assignees && goal.assignees.length > 0}
									<span class="flex items-center gap-1">
										<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
										</svg>
										{goal.assignees.map((a: { name: string }) => a.name).join(', ')}
									</span>
								{/if}
							</div>
						</div>
						<div class="ml-4 text-right">
							<div class="text-sm text-gray-500 mb-1">進捗</div>
							<div class="text-2xl font-bold text-gray-900">
								{getProgress(goal.completed_reviews, goal.total_reviews)}%
							</div>
							<div class="text-xs text-gray-500">
								{goal.completed_reviews}/{goal.total_reviews} レビュー
							</div>
							<div class="w-24 h-2 bg-gray-200 rounded-full mt-2">
								<div
									class="h-2 rounded-full transition-all"
									style="width: {getProgress(goal.completed_reviews, goal.total_reviews)}%; background-color: {goal.color}"
								></div>
							</div>
						</div>
					</div>
				</a>
			{:else}
				<div class="bg-white shadow rounded-lg p-8 text-center text-gray-500">
					プロジェクトが見つかりません
				</div>
			{/each}
		</div>
	</div>
</AppLayout>
