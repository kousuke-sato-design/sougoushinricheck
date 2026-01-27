<script lang="ts">
	interface CalendarItem {
		id: string;
		title: string;
		due_date: string;
		type: 'goal' | 'review';
		status: string;
		color: string;
		description?: string;
	}

	interface Props {
		items: CalendarItem[];
	}

	let { items }: Props = $props();

	const statusLabels: Record<string, string> = {
		pending: '未着手',
		in_progress: '進行中',
		in_review: '確認中',
		completed: '完了',
		approved: '承認済',
		rejected: '差し戻し',
		on_hold: '保留'
	};

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			weekday: 'short'
		});
	}

	function isOverdue(dateStr: string, status: string): boolean {
		if (status === 'completed' || status === 'approved') return false;
		return new Date(dateStr) < new Date();
	}

	function groupItemsByDate(items: CalendarItem[]): Map<string, CalendarItem[]> {
		const grouped = new Map<string, CalendarItem[]>();
		const sortedItems = [...items].sort((a, b) =>
			new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
		);

		for (const item of sortedItems) {
			const dateKey = new Date(item.due_date).toISOString().split('T')[0];
			if (!grouped.has(dateKey)) {
				grouped.set(dateKey, []);
			}
			grouped.get(dateKey)!.push(item);
		}
		return grouped;
	}

	const groupedItems = $derived(groupItemsByDate(items));
</script>

<div class="bg-white rounded-lg shadow divide-y">
	{#each [...groupedItems.entries()] as [dateKey, dateItems]}
		<div class="p-4">
			<div class="text-sm font-semibold text-gray-500 mb-3">
				{formatDate(dateKey)}
			</div>
			<div class="space-y-2">
				{#each dateItems as item}
					<a
						href={item.type === 'goal' ? `/goals/${item.id}` : `/reviews/${item.id}`}
						class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
					>
						<div
							class="w-1 h-12 rounded-full flex-shrink-0"
							style="background-color: {item.color}"
						></div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<span class="text-xs px-1.5 py-0.5 rounded {item.type === 'goal' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
									{item.type === 'goal' ? 'プロジェクト' : 'レビュー'}
								</span>
								<span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
									{statusLabels[item.status] || item.status}
								</span>
								{#if isOverdue(item.due_date, item.status)}
									<span class="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
										期限超過
									</span>
								{/if}
							</div>
							<div class="font-medium text-gray-900 mt-1 truncate">{item.title}</div>
							{#if item.description}
								<div class="text-sm text-gray-500 mt-0.5 truncate">{item.description}</div>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</div>
	{:else}
		<div class="p-8 text-center text-gray-500">
			表示するアイテムがありません
		</div>
	{/each}
</div>
