<script lang="ts">
	interface CalendarItem {
		id: string;
		title: string;
		due_date: string;
		type: 'goal' | 'review';
		status: string;
		color: string;
	}

	interface Props {
		year: number;
		month: number;
		items: CalendarItem[];
		onDateClick?: (date: Date) => void;
	}

	let { year, month, items, onDateClick }: Props = $props();

	const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

	function getDaysInMonth(year: number, month: number): Date[] {
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const days: Date[] = [];

		// Add padding days from previous month
		const startPadding = firstDay.getDay();
		for (let i = startPadding - 1; i >= 0; i--) {
			const d = new Date(year, month, -i);
			days.push(d);
		}

		// Add days of current month
		for (let i = 1; i <= lastDay.getDate(); i++) {
			days.push(new Date(year, month, i));
		}

		// Add padding days from next month
		const endPadding = 6 - lastDay.getDay();
		for (let i = 1; i <= endPadding; i++) {
			days.push(new Date(year, month + 1, i));
		}

		return days;
	}

	function isToday(date: Date): boolean {
		const today = new Date();
		return date.toDateString() === today.toDateString();
	}

	function isCurrentMonth(date: Date): boolean {
		return date.getMonth() === month;
	}

	function getItemsForDate(date: Date): CalendarItem[] {
		const dateStr = date.toISOString().split('T')[0];
		return items.filter(item => {
			const itemDate = new Date(item.due_date).toISOString().split('T')[0];
			return itemDate === dateStr;
		});
	}

	function handleDateClick(date: Date) {
		if (onDateClick) {
			onDateClick(date);
		}
	}

	const days = $derived(getDaysInMonth(year, month));
</script>

<div class="bg-white rounded-lg shadow">
	<!-- Week day headers -->
	<div class="grid grid-cols-7 border-b">
		{#each weekDays as day, i}
			<div class="py-2 text-center text-sm font-medium {i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-700'}">
				{day}
			</div>
		{/each}
	</div>

	<!-- Calendar grid -->
	<div class="grid grid-cols-7">
		{#each days as date, i}
			{@const dayItems = getItemsForDate(date)}
			<button
				type="button"
				class="min-h-24 p-1 border-b border-r text-left hover:bg-gray-50 transition-colors
					{!isCurrentMonth(date) ? 'bg-gray-50' : ''}
					{i % 7 === 6 ? 'border-r-0' : ''}"
				onclick={() => handleDateClick(date)}
			>
				<div class="flex justify-between items-start">
					<span class="text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full
						{isToday(date) ? 'bg-blue-600 text-white' : ''}
						{!isCurrentMonth(date) ? 'text-gray-400' : ''}
						{i % 7 === 0 && isCurrentMonth(date) && !isToday(date) ? 'text-red-500' : ''}
						{i % 7 === 6 && isCurrentMonth(date) && !isToday(date) ? 'text-blue-500' : ''}">
						{date.getDate()}
					</span>
				</div>
				<div class="mt-1 space-y-0.5 overflow-hidden">
					{#each dayItems.slice(0, 3) as item}
						<a
							href={item.type === 'goal' ? `/goals/${item.id}` : `/reviews/${item.id}`}
							class="block px-1.5 py-0.5 text-xs rounded truncate text-white hover:opacity-80"
							style="background-color: {item.color}"
							onclick={(e) => e.stopPropagation()}
						>
							{item.type === 'goal' ? '' : ''}{item.title}
						</a>
					{/each}
					{#if dayItems.length > 3}
						<div class="text-xs text-gray-500 px-1">+{dayItems.length - 3} more</div>
					{/if}
				</div>
			</button>
		{/each}
	</div>
</div>
