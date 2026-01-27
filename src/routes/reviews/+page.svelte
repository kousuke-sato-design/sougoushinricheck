<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const statusLabels: Record<string, string> = {
		draft: '未通知',
		pending: '依頼中',
		in_review: '確認中',
		approved: '承認済',
		rejected: '差し戻し'
	};

	const statusColors: Record<string, string> = {
		draft: 'bg-slate-100 text-slate-600 border border-slate-300',
		pending: 'bg-yellow-100 text-yellow-800',
		in_review: 'bg-blue-100 text-blue-800',
		approved: 'bg-green-100 text-green-800',
		rejected: 'bg-red-100 text-red-800'
	};

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	let searchInput = $state(data.search);
</script>

<AppLayout user={data.user}>
	<div class="px-4 sm:px-0">
		<div class="flex items-center justify-between mb-6">
			<h1 class="text-2xl font-bold text-gray-900">レビュー一覧</h1>
			<a
				href="/reviews/new"
				class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
			>
				新規依頼
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
						<option value="assigned">依頼されたもの</option>
						<option value="created">依頼したもの</option>
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
						<option value="draft">未通知</option>
						<option value="pending">依頼中</option>
						<option value="in_review">確認中</option>
						<option value="approved">承認済</option>
						<option value="rejected">差し戻し</option>
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

		<!-- Review List -->
		<div class="bg-white shadow rounded-lg overflow-hidden">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							タイトル
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							タグ
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							ステータス
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							進捗
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							依頼者
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							期限
						</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each data.reviews as review}
						<tr class="hover:bg-gray-50">
							<td class="px-6 py-4">
								<a href="/reviews/{review.id}" class="text-blue-600 hover:underline font-medium">
									{review.title}
								</a>
							</td>
							<td class="px-6 py-4">
								<div class="flex flex-wrap gap-1.5">
									{#if review.tags && review.tags.length > 0}
										{#each review.tags as tag}
											<span
												class="px-2.5 py-1 text-xs font-bold rounded-full shadow-sm"
												style="background-color: {tag.color}; color: white"
											>
												{tag.name}
											</span>
										{/each}
									{:else}
										<span class="text-xs text-gray-400">-</span>
									{/if}
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="px-2 py-1 text-xs rounded-full {statusColors[review.status]}">
									{statusLabels[review.status]}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{review.approved_count}/{review.total_assignees}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{review.requester_name}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{review.due_date ? formatDate(review.due_date) : '-'}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="px-6 py-8 text-center text-gray-500">
								レビューが見つかりません
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</AppLayout>
