<script lang="ts">
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

		goto(`/calendar/${data.token}?year=${newYear}&month=${newMonth}&view=${data.view}&filter=${data.filter}`);
	}

	function changeView(view: string) {
		goto(`/calendar/${data.token}?year=${data.year}&month=${data.month}&view=${view}&filter=${data.filter}`);
	}

	function changeFilter(filter: string) {
		goto(`/calendar/${data.token}?year=${data.year}&month=${data.month}&view=${data.view}&filter=${filter}`);
	}

	function goToToday() {
		const now = new Date();
		goto(`/calendar/${data.token}?year=${now.getFullYear()}&month=${now.getMonth()}&view=${data.view}&filter=${data.filter}`);
	}

	function getWeeksInMonth(): number {
		const firstDay = new Date(data.year, data.month, 1);
		const lastDay = new Date(data.year, data.month + 1, 0);
		const startPadding = firstDay.getDay();
		const totalDays = startPadding + lastDay.getDate();
		return Math.ceil(totalDays / 7);
	}
</script>

<svelte:head>
	<title>カレンダー - {data.user.name}</title>
</svelte:head>

<div class="min-h-screen bg-slate-50">
	<!-- Header -->
	<header class="bg-white border-b border-slate-200 sticky top-0 z-10">
		<div class="max-w-7xl mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
						<svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
					</div>
					<div>
						<h1 class="font-bold text-lg text-slate-900">カレンダー</h1>
						<p class="text-sm text-slate-500">{data.user.name} さんのスケジュール</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<a href="/" class="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg">
						ログインして操作
					</a>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 py-6">
		<!-- Controls -->
		<div class="flex items-center justify-between mb-6">
			<div class="flex items-center gap-4">
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
	</main>

	<!-- Footer -->
	<footer class="border-t border-slate-200 mt-12 py-6 text-center text-sm text-slate-500">
		レビュー管理システム - マジックリンクでアクセス中
	</footer>
</div>
