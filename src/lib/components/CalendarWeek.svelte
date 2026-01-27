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
		week: number;
		items: CalendarItem[];
	}

	let { year, month, week, items }: Props = $props();

	const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

	function getWeekDates(): Date[] {
		const firstDayOfMonth = new Date(year, month, 1);
		const firstDayOfWeek = firstDayOfMonth.getDay();
		const startDate = new Date(year, month, 1 - firstDayOfWeek + (week * 7));

		const dates: Date[] = [];
		for (let i = 0; i < 7; i++) {
			const d = new Date(startDate);
			d.setDate(startDate.getDate() + i);
			dates.push(d);
		}
		return dates;
	}

	function isToday(date: Date): boolean {
		const today = new Date();
		return date.toDateString() === today.toDateString();
	}

	function getItemsForDate(date: Date): CalendarItem[] {
		const dateStr = date.toISOString().split('T')[0];
		return items.filter(item => {
			const itemDate = new Date(item.due_date).toISOString().split('T')[0];
			return itemDate === dateStr;
		});
	}

	function formatDate(date: Date): string {
		return `${date.getMonth() + 1}/${date.getDate()}`;
	}

	const dates = $derived(getWeekDates());
</script>

<div class="bg-white rounded-lg shadow overflow-hidden">
	<!-- Header -->
	<div class="grid grid-cols-7 border-b bg-gray-50">
		{#each dates as date, i}
			<div class="py-3 text-center border-r last:border-r-0">
				<div class="text-xs font-medium {i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}">
					{weekDays[i]}
				</div>
				<div class="mt-1 text-lg font-semibold {isToday(date) ? 'w-8 h-8 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center' : ''}">
					{date.getDate()}
				</div>
				<div class="text-xs text-gray-400">{formatDate(date)}</div>
			</div>
		{/each}
	</div>

	<!-- Content -->
	<div class="grid grid-cols-7 min-h-96">
		{#each dates as date, i}
			{@const dayItems = getItemsForDate(date)}
			<div class="border-r last:border-r-0 p-2 space-y-1">
				{#each dayItems as item}
					<a
						href={item.type === 'goal' ? `/goals/${item.id}` : `/reviews/${item.id}`}
						class="block p-2 rounded text-sm hover:opacity-80 transition-opacity"
						style="background-color: {item.color}15; border-left: 3px solid {item.color}"
					>
						<div class="font-medium text-gray-900 truncate">{item.title}</div>
						<div class="text-xs text-gray-500 mt-0.5">
							{item.type === 'goal' ? 'プロジェクト' : 'レビュー'}
						</div>
					</a>
				{/each}
			</div>
		{/each}
	</div>
</div>
