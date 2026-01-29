<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	// Local filter state
	let type = $state(data.filters.type);
	let status = $state(data.filters.status);
	let sort = $state(data.filters.sort);
	let search = $state(data.filters.search);
	let projectId = $state(data.filters.projectId);

	const docStatusLabels: Record<string, string> = {
		draft: '下書き',
		pending: '確認待ち',
		approved: '確認OK',
		rejected: 'コメントあり'
	};

	const docStatusColors: Record<string, string> = {
		draft: 'bg-slate-100 text-slate-600',
		pending: 'bg-yellow-100 text-yellow-800',
		approved: 'bg-green-100 text-green-800',
		rejected: 'bg-red-100 text-red-800'
	};

	const projStatusLabels: Record<string, string> = {
		pending: '未着手',
		in_progress: '進行中',
		completed: '完了',
		on_hold: '保留'
	};

	const projStatusColors: Record<string, string> = {
		pending: 'bg-slate-100 text-slate-600',
		in_progress: 'bg-blue-100 text-blue-700',
		completed: 'bg-green-100 text-green-700',
		on_hold: 'bg-amber-100 text-amber-700'
	};

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (type !== 'all') params.set('type', type);
		if (status !== 'all') params.set('status', status);
		if (sort !== 'newest') params.set('sort', sort);
		if (search) params.set('search', search);
		if (projectId) params.set('project', projectId);
		goto(`/admin?${params.toString()}`);
	}

	function clearFilters() {
		type = 'all';
		status = 'all';
		sort = 'newest';
		search = '';
		projectId = '';
		goto('/admin');
	}
</script>

<AppLayout user={data.user}>
	<div class="px-4 sm:px-0">
		<div class="flex items-center justify-between mb-6">
			<h1 class="text-2xl font-bold text-gray-900">全体管理</h1>
		</div>

		<!-- Stats Cards -->
		<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
			<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
						<span class="text-xl">📄</span>
					</div>
					<div>
						<p class="text-2xl font-bold text-slate-900">{data.stats.documents.total}</p>
						<p class="text-sm text-slate-500">ドキュメント</p>
					</div>
				</div>
				<div class="mt-3 flex gap-2 text-xs">
					<span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">{data.stats.documents.pending} 待ち</span>
					<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{data.stats.documents.approved} 完了</span>
				</div>
			</div>
			<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
						<span class="text-xl">🎯</span>
					</div>
					<div>
						<p class="text-2xl font-bold text-slate-900">{data.stats.projects.total}</p>
						<p class="text-sm text-slate-500">プロジェクト</p>
					</div>
				</div>
				<div class="mt-3 flex gap-2 text-xs">
					<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{data.stats.projects.in_progress} 進行中</span>
					<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{data.stats.projects.completed} 完了</span>
				</div>
			</div>
			<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
						<span class="text-xl">👥</span>
					</div>
					<div>
						<p class="text-2xl font-bold text-slate-900">{data.members.length}</p>
						<p class="text-sm text-slate-500">メンバー</p>
					</div>
				</div>
			</div>
			<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
						<span class="text-xl">📊</span>
					</div>
					<div>
						<p class="text-2xl font-bold text-slate-900">{data.allProjects.length}</p>
						<p class="text-sm text-slate-500">アクティブPJ</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Filters -->
		<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
			<div class="flex flex-wrap items-end gap-4">
				<div class="flex-1 min-w-[200px]">
					<label class="block text-sm font-medium text-slate-700 mb-1">検索</label>
					<input
						type="text"
						bind:value={search}
						placeholder="タイトルで検索..."
						class="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						onkeydown={(e) => e.key === 'Enter' && applyFilters()}
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-1">種類</label>
					<select bind:value={type} onchange={applyFilters} class="px-3 py-2 border border-slate-200 rounded-lg">
						<option value="all">すべて</option>
						<option value="documents">ドキュメントのみ</option>
						<option value="projects">プロジェクトのみ</option>
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
					<select bind:value={status} onchange={applyFilters} class="px-3 py-2 border border-slate-200 rounded-lg">
						<option value="all">すべて</option>
						{#if type !== 'projects'}
							<option value="draft">下書き</option>
							<option value="pending">確認待ち</option>
							<option value="approved">確認OK</option>
						{/if}
						{#if type !== 'documents'}
							<option value="in_progress">進行中</option>
							<option value="completed">完了</option>
						{/if}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-1">プロジェクト</label>
					<select bind:value={projectId} onchange={applyFilters} class="px-3 py-2 border border-slate-200 rounded-lg">
						<option value="">すべて</option>
						{#each data.allProjects as project}
							<option value={project.id}>{project.title}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-1">並び順</label>
					<select bind:value={sort} onchange={applyFilters} class="px-3 py-2 border border-slate-200 rounded-lg">
						<option value="newest">新しい順</option>
						<option value="oldest">古い順</option>
						<option value="title">タイトル順</option>
						<option value="status">ステータス順</option>
					</select>
				</div>
				<button
					type="button"
					onclick={clearFilters}
					class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
				>
					クリア
				</button>
			</div>
		</div>

		<!-- Documents Section -->
		{#if type === 'all' || type === 'documents'}
			<div class="bg-white shadow rounded-lg overflow-hidden mb-6">
				<div class="px-6 py-4 border-b border-slate-200 bg-blue-50">
					<h2 class="text-lg font-semibold text-blue-800 flex items-center gap-2">
						📄 ドキュメント一覧
						<span class="text-sm font-normal text-blue-600">({data.documents.length}件)</span>
					</h2>
				</div>

				{#if data.documents.length > 0}
					<!-- Mobile Cards -->
					<div class="lg:hidden divide-y divide-slate-100">
						{#each data.documents as doc}
							<a href="/reviews/{doc.id}" class="block p-4 hover:bg-slate-50">
								<div class="flex items-start justify-between gap-2">
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-lg">{doc.emoji || '📄'}</span>
											<span class="font-medium text-slate-900 truncate">{doc.title}</span>
										</div>
										<div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
											{#if doc.goal_title}
												<span class="px-2 py-0.5 rounded-full" style="background-color: {doc.goal_color}20; color: {doc.goal_color}">
													{doc.goal_title}
												</span>
											{/if}
											<span class="text-slate-500">{doc.requester_name}</span>
											<span class="text-slate-400">{formatDate(doc.created_at)}</span>
										</div>
									</div>
									<span class="px-2 py-1 text-xs rounded-full shrink-0 {docStatusColors[doc.status] || docStatusColors.draft}">
										{docStatusLabels[doc.status] || doc.status}
									</span>
								</div>
							</a>
						{/each}
					</div>

					<!-- Desktop Table -->
					<div class="hidden lg:block overflow-x-auto">
						<table class="min-w-full">
							<thead class="bg-slate-50">
								<tr>
									<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">タイトル</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">プロジェクト</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">作成者</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ステータス</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">作成日</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-200">
								{#each data.documents as doc}
									<tr class="hover:bg-slate-50">
										<td class="px-6 py-4">
											<a href="/reviews/{doc.id}" class="text-blue-600 hover:underline font-medium">
												{doc.emoji || '📄'} {doc.title}
											</a>
										</td>
										<td class="px-6 py-4">
											{#if doc.goal_id}
												<a href="/goals/{doc.goal_id}" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs" style="background-color: {doc.goal_color}20; color: {doc.goal_color}">
													<span class="w-2 h-2 rounded-full" style="background-color: {doc.goal_color}"></span>
													{doc.goal_title}
												</a>
											{:else}
												<span class="text-slate-400">-</span>
											{/if}
										</td>
										<td class="px-6 py-4 text-sm text-slate-600">{doc.requester_name}</td>
										<td class="px-6 py-4">
											<span class="px-2 py-1 text-xs rounded-full {docStatusColors[doc.status] || docStatusColors.draft}">
												{docStatusLabels[doc.status] || doc.status}
											</span>
										</td>
										<td class="px-6 py-4 text-sm text-slate-500">{formatDate(doc.created_at)}</td>
										<td class="px-6 py-4">
											<a href="/reviews/{doc.id}" class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100">
												<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
												</svg>
												開く
											</a>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="p-8 text-center text-slate-500">
						ドキュメントがありません
					</div>
				{/if}
			</div>
		{/if}

		<!-- Projects Section -->
		{#if type === 'all' || type === 'projects'}
			<div class="bg-white shadow rounded-lg overflow-hidden">
				<div class="px-6 py-4 border-b border-slate-200 bg-rose-50">
					<h2 class="text-lg font-semibold text-rose-800 flex items-center gap-2">
						🎯 プロジェクト一覧
						<span class="text-sm font-normal text-rose-600">({data.projects.length}件)</span>
					</h2>
				</div>

				{#if data.projects.length > 0}
					<!-- Mobile Cards -->
					<div class="lg:hidden divide-y divide-slate-100">
						{#each data.projects as proj}
							<a href="/goals/{proj.id}" class="block p-4 hover:bg-slate-50">
								<div class="flex items-start justify-between gap-2">
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span class="w-3 h-3 rounded-full shrink-0" style="background-color: {proj.color}"></span>
											<span class="font-medium text-slate-900 truncate">{proj.title}</span>
										</div>
										<div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
											<span class="text-slate-500">{proj.creator_name}</span>
											<span class="text-slate-400">{formatDate(proj.created_at)}</span>
											<span class="text-slate-500">📄 {proj.document_count}件</span>
										</div>
									</div>
									<span class="px-2 py-1 text-xs rounded-full shrink-0 {projStatusColors[proj.status] || projStatusColors.pending}">
										{projStatusLabels[proj.status] || proj.status}
									</span>
								</div>
							</a>
						{/each}
					</div>

					<!-- Desktop Table -->
					<div class="hidden lg:block overflow-x-auto">
						<table class="min-w-full">
							<thead class="bg-slate-50">
								<tr>
									<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">タイトル</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">作成者</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ドキュメント数</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ステータス</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">期限</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">作成日</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-slate-200">
								{#each data.projects as proj}
									<tr class="hover:bg-slate-50">
										<td class="px-6 py-4">
											<a href="/goals/{proj.id}" class="flex items-center gap-2 text-blue-600 hover:underline font-medium">
												<span class="w-3 h-3 rounded-full shrink-0" style="background-color: {proj.color}"></span>
												{proj.title}
											</a>
										</td>
										<td class="px-6 py-4 text-sm text-slate-600">{proj.creator_name}</td>
										<td class="px-6 py-4 text-sm text-slate-600">
											<span class="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
												📄 {proj.document_count}件
											</span>
										</td>
										<td class="px-6 py-4">
											<span class="px-2 py-1 text-xs rounded-full {projStatusColors[proj.status] || projStatusColors.pending}">
												{projStatusLabels[proj.status] || proj.status}
											</span>
										</td>
										<td class="px-6 py-4 text-sm text-slate-500">
											{#if proj.due_date}
												{formatDate(proj.due_date)}
											{:else}
												<span class="text-slate-400">-</span>
											{/if}
										</td>
										<td class="px-6 py-4 text-sm text-slate-500">{formatDate(proj.created_at)}</td>
										<td class="px-6 py-4">
											<a href="/goals/{proj.id}" class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100">
												<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
												</svg>
												開く
											</a>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="p-8 text-center text-slate-500">
						プロジェクトがありません
					</div>
				{/if}
			</div>
		{/if}
	</div>
</AppLayout>
