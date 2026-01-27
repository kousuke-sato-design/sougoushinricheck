<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import CalendarMonth from '$lib/components/CalendarMonth.svelte';
	import CalendarWeek from '$lib/components/CalendarWeek.svelte';
	import CalendarList from '$lib/components/CalendarList.svelte';
	import CalendarGantt from '$lib/components/CalendarGantt.svelte';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	const monthNames = [
		'1月', '2月', '3月', '4月', '5月', '6月',
		'7月', '8月', '9月', '10月', '11月', '12月'
	];

	const views = [
		{ value: 'month', label: '月' },
		{ value: 'week', label: '週' },
		{ value: 'list', label: 'リスト' },
		{ value: 'gantt', label: 'ガント' }
	];

	let currentWeek = $state(0);

	function navigate(direction: number) {
		let newYear = data.year;
		let newMonth = data.month + direction;

		if (newMonth < 0) {
			newMonth = 11;
			newYear--;
		} else if (newMonth > 11) {
			newMonth = 0;
			newYear++;
		}

		goto(`/calendar?year=${newYear}&month=${newMonth}&view=${data.view}&filter=${data.filter}`);
	}

	function changeView(view: string) {
		goto(`/calendar?year=${data.year}&month=${data.month}&view=${view}&filter=${data.filter}`);
	}

	function changeFilter(filter: string) {
		goto(`/calendar?year=${data.year}&month=${data.month}&view=${data.view}&filter=${filter}`);
	}

	function goToToday() {
		const now = new Date();
		goto(`/calendar?year=${now.getFullYear()}&month=${now.getMonth()}&view=${data.view}&filter=${data.filter}`);
	}

	function getWeeksInMonth(): number {
		const firstDay = new Date(data.year, data.month, 1);
		const lastDay = new Date(data.year, data.month + 1, 0);
		const startPadding = firstDay.getDay();
		const totalDays = startPadding + lastDay.getDate();
		return Math.ceil(totalDays / 7);
	}
</script>

<AppLayout user={data.user}>
	<div class="px-4 sm:px-0">
		<!-- Header -->
		<div class="flex items-center justify-between mb-6">
			<div class="flex items-center gap-4">
				<h1 class="text-2xl font-bold text-gray-900">カレンダー</h1>
				<button
					type="button"
					class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
					onclick={goToToday}
				>
					今日
				</button>
			</div>

			<div class="flex items-center gap-4">
				<!-- Filter -->
				<select
					class="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
					value={data.filter}
					onchange={(e) => changeFilter(e.currentTarget.value)}
				>
					<option value="all">すべて</option>
					<option value="goals">プロジェクトのみ</option>
					<option value="reviews">レビューのみ</option>
				</select>

				<!-- View toggle -->
				<div class="flex bg-gray-100 rounded-lg p-1">
					{#each views as view}
						<button
							type="button"
							class="px-3 py-1.5 text-sm rounded-md transition-colors {data.view === view.value ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'}"
							onclick={() => changeView(view.value)}
						>
							{view.label}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Month/Year navigation -->
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2">
				<button
					type="button"
					class="p-2 hover:bg-gray-100 rounded-full"
					onclick={() => navigate(-1)}
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<h2 class="text-xl font-semibold text-gray-900">
					{data.year}年 {monthNames[data.month]}
				</h2>
				<button
					type="button"
					class="p-2 hover:bg-gray-100 rounded-full"
					onclick={() => navigate(1)}
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			</div>

			{#if data.view === 'week'}
				<div class="flex items-center gap-2">
					<button
						type="button"
						class="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
						disabled={currentWeek === 0}
						onclick={() => currentWeek--}
					>
						前週
					</button>
					<span class="text-sm text-gray-600">第{currentWeek + 1}週</span>
					<button
						type="button"
						class="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
						disabled={currentWeek >= getWeeksInMonth() - 1}
						onclick={() => currentWeek++}
					>
						次週
					</button>
				</div>
			{/if}

			<a
				href="/goals/new"
				class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
			>
				+ プロジェクト追加
			</a>
		</div>

		<!-- Calendar View -->
		{#if data.view === 'month'}
			<CalendarMonth
				year={data.year}
				month={data.month}
				items={data.items}
			/>
		{:else if data.view === 'week'}
			<CalendarWeek
				year={data.year}
				month={data.month}
				week={currentWeek}
				items={data.items}
			/>
		{:else if data.view === 'list'}
			<CalendarList items={data.items} />
		{:else if data.view === 'gantt'}
			<CalendarGantt
				year={data.year}
				month={data.month}
				items={data.items}
			/>
		{/if}

		<!-- Legend -->
		<div class="mt-6 flex items-center gap-6 text-sm text-gray-600">
			<div class="flex items-center gap-2">
				<div class="w-3 h-3 rounded-full bg-purple-500"></div>
				<span>プロジェクト</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="w-3 h-3 rounded-full bg-blue-500"></div>
				<span>レビュー</span>
			</div>
		</div>
	</div>
</AppLayout>
