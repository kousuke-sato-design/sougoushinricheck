<script lang="ts">
	interface CalendarItem {
		id: string;
		title: string;
		due_date: string;
		created_at?: string;
		type: 'goal' | 'review';
		status: string;
		color: string;
	}

	interface Props {
		year: number;
		month: number;
		items: CalendarItem[];
	}

	let { year, month, items }: Props = $props();

	function getDaysInMonth(): number {
		return new Date(year, month + 1, 0).getDate();
	}

	function isToday(day: number): boolean {
		const today = new Date();
		return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
	}

	function getBarPosition(item: CalendarItem): { start: number; width: number } {
		const startDate = item.created_at ? new Date(item.created_at) : new Date(item.due_date);
		const endDate = new Date(item.due_date);
		const daysInMonth = getDaysInMonth();

		// Calculate start position (as percentage)
		let startDay = 1;
		if (startDate.getFullYear() === year && startDate.getMonth() === month) {
			startDay = startDate.getDate();
		} else if (startDate > new Date(year, month + 1, 0)) {
			return { start: 100, width: 0 }; // Item starts after this month
		}

		// Calculate end position
		let endDay = daysInMonth;
		if (endDate.getFullYear() === year && endDate.getMonth() === month) {
			endDay = endDate.getDate();
		} else if (endDate < new Date(year, month, 1)) {
			return { start: 0, width: 0 }; // Item ends before this month
		}

		const start = ((startDay - 1) / daysInMonth) * 100;
		const width = ((endDay - startDay + 1) / daysInMonth) * 100;

		return { start, width: Math.max(width, 3) }; // Minimum 3% width for visibility
	}

	const daysInMonth = $derived(getDaysInMonth());
	const sortedItems = $derived([...items].sort((a, b) =>
		new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
	));
</script>

<div class="bg-white rounded-lg shadow overflow-hidden">
	<!-- Header with days -->
	<div class="flex border-b bg-gray-50 sticky top-0">
		<div class="w-48 flex-shrink-0 p-2 border-r font-medium text-sm text-gray-700">
			タスク名
		</div>
		<div class="flex-1 flex">
			{#each Array(daysInMonth) as _, i}
				{@const day = i + 1}
				<div
					class="flex-1 text-center py-2 text-xs border-r last:border-r-0
						{isToday(day) ? 'bg-blue-100 font-bold text-blue-700' : 'text-gray-500'}
						{(new Date(year, month, day).getDay() === 0) ? 'text-red-500' : ''}
						{(new Date(year, month, day).getDay() === 6) ? 'text-blue-500' : ''}"
					style="min-width: 24px"
				>
					{day}
				</div>
			{/each}
		</div>
	</div>

	<!-- Gantt rows -->
	<div class="divide-y">
		{#each sortedItems as item}
			{@const pos = getBarPosition(item)}
			<div class="flex hover:bg-gray-50">
				<div class="w-48 flex-shrink-0 p-2 border-r">
					<a
						href={item.type === 'goal' ? `/goals/${item.id}` : `/reviews/${item.id}`}
						class="text-sm text-blue-600 hover:underline truncate block"
					>
						{item.title}
					</a>
					<div class="text-xs text-gray-500 mt-0.5">
						{item.type === 'goal' ? 'プロジェクト' : 'レビュー'}
					</div>
				</div>
				<div class="flex-1 relative h-12 flex items-center">
					<!-- Grid lines -->
					<div class="absolute inset-0 flex">
						{#each Array(daysInMonth) as _, i}
							<div
								class="flex-1 border-r last:border-r-0 {isToday(i + 1) ? 'bg-blue-50' : ''}"
								style="min-width: 24px"
							></div>
						{/each}
					</div>
					<!-- Bar -->
					{#if pos.width > 0}
						<div
							class="absolute h-6 rounded-sm shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
							style="left: {pos.start}%; width: {pos.width}%; background-color: {item.color}"
						>
							<span class="text-xs text-white px-1 truncate block leading-6 font-medium">
								{item.title}
							</span>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="p-8 text-center text-gray-500">
				表示するアイテムがありません
			</div>
		{/each}
	</div>
</div>
