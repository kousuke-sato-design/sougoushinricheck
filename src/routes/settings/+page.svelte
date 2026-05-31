<script lang="ts">
	import AppLayout from '$lib/components/AppLayout.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Tag management
	let showNewTagForm = $state(false);
	let newTagName = $state('');
	let newTagColor = $state('#3b82f6');
	let editingTagId = $state<string | null>(null);
	let editingTagName = $state('');
	let editingTagColor = $state('');

	const colorOptions = [
		{ value: '#ef4444', label: '赤' },
		{ value: '#f97316', label: 'オレンジ' },
		{ value: '#f59e0b', label: 'アンバー' },
		{ value: '#eab308', label: '黄' },
		{ value: '#84cc16', label: 'ライム' },
		{ value: '#22c55e', label: '緑' },
		{ value: '#10b981', label: 'エメラルド' },
		{ value: '#14b8a6', label: 'ティール' },
		{ value: '#06b6d4', label: 'シアン' },
		{ value: '#0ea5e9', label: 'スカイ' },
		{ value: '#3b82f6', label: '青' },
		{ value: '#6366f1', label: 'インディゴ' },
		{ value: '#8b5cf6', label: '紫' },
		{ value: '#a855f7', label: 'バイオレット' },
		{ value: '#d946ef', label: 'フクシア' },
		{ value: '#ec4899', label: 'ピンク' },
		{ value: '#f43f5e', label: 'ローズ' },
		{ value: '#78716c', label: 'グレー' }
	];

	function startEditTag(tag: { id: string; name: string; color: string }) {
		editingTagId = tag.id;
		editingTagName = tag.name;
		editingTagColor = tag.color;
	}

	function cancelEditTag() {
		editingTagId = null;
		editingTagName = '';
		editingTagColor = '';
	}

	// Email account management (複数Gmailアカウント)
	let showAccountForm = $state(false);
	let editingAccountId = $state<string | null>(null);
	let accFromName = $state('');
	let accEmail = $state('');
	let accHost = $state('smtp.gmail.com');
	let accPort = $state(587);
	let accPassword = $state('');

	function openNewAccount() {
		editingAccountId = null;
		accFromName = '';
		accEmail = '';
		accHost = 'smtp.gmail.com';
		accPort = 587;
		accPassword = '';
		showAccountForm = true;
	}

	function openEditAccount(acc: {
		id: string;
		email_address: string;
		smtp_host: string;
		smtp_port: number;
		from_name: string | null;
	}) {
		editingAccountId = acc.id;
		accFromName = acc.from_name || '';
		accEmail = acc.email_address;
		accHost = acc.smtp_host;
		accPort = acc.smtp_port;
		accPassword = '';
		showAccountForm = true;
	}

	function closeAccountForm() {
		showAccountForm = false;
		editingAccountId = null;
	}
</script>

<AppLayout user={data.user}>
	<div class="px-4 sm:px-0">
		<h1 class="text-2xl font-bold text-gray-900 mb-6">設定</h1>

		<!-- Tag Management -->
		<div class="bg-white shadow rounded-lg mb-6">
			<div class="px-4 py-5 sm:px-6 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-lg font-medium text-gray-900">タグ管理</h2>
						<p class="mt-1 text-sm text-gray-500">レビューに使用するタグを管理します</p>
					</div>
					<button
						type="button"
						onclick={() => showNewTagForm = !showNewTagForm}
						class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
					>
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						新規タグ
					</button>
				</div>
			</div>

			<div class="p-6">
				{#if form?.error && (form?.action === 'createTag' || form?.action === 'updateTag' || form?.action === 'deleteTag')}
					<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
						{form.error}
					</div>
				{/if}

				{#if form?.success && (form?.action === 'createTag' || form?.action === 'updateTag' || form?.action === 'deleteTag')}
					<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
						タグを{form.action === 'createTag' ? '作成' : form.action === 'updateTag' ? '更新' : '削除'}しました
					</div>
				{/if}

				<!-- New Tag Form -->
				{#if showNewTagForm}
					<form method="POST" action="?/createTag" class="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 mb-6 border border-slate-200">
						<h3 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
							<svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
							</svg>
							新しいタグを作成
						</h3>
						<div class="space-y-4">
							<div>
								<label for="newTagName" class="block text-sm font-medium text-slate-700 mb-2">タグ名</label>
								<input
									type="text"
									id="newTagName"
									name="name"
									required
									bind:value={newTagName}
									placeholder="例: 重要, 確認中, デザイン..."
									class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-slate-700 mb-2">カラーを選択</label>
								<input type="hidden" name="color" value={newTagColor} />
								<div class="flex flex-wrap gap-2">
									{#each colorOptions as color}
										<button
											type="button"
											onclick={() => newTagColor = color.value}
											class="w-9 h-9 rounded-lg border-2 transition-all hover:scale-110 {newTagColor === color.value ? 'border-slate-900 scale-110 ring-2 ring-offset-2 ring-slate-400' : 'border-white shadow-sm'}"
											style="background-color: {color.value}"
											title={color.label}
										></button>
									{/each}
								</div>
							</div>
							<div class="pt-2">
								<label class="block text-sm font-medium text-slate-700 mb-2">プレビュー</label>
								<div class="flex items-center gap-3">
									<span
										class="px-4 py-2 text-sm font-semibold rounded-full shadow-sm"
										style="background-color: {newTagColor}20; color: {newTagColor}; border: 2px solid {newTagColor}"
									>
										{newTagName || 'タグ名'}
									</span>
									<span class="text-slate-400 text-sm">← このように表示されます</span>
								</div>
							</div>
						</div>
						<div class="flex gap-3 mt-6 pt-4 border-t border-slate-200">
							<button type="button" onclick={() => showNewTagForm = false} class="flex-1 px-4 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-medium">
								キャンセル
							</button>
							<button type="submit" class="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
								タグを作成
							</button>
						</div>
					</form>
				{/if}

				<!-- Tag List -->
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{#each data.tags as tag}
						{#if editingTagId === tag.id}
							<!-- Edit Mode -->
							<form method="POST" action="?/updateTag" class="col-span-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 border border-slate-200">
								<input type="hidden" name="tagId" value={tag.id} />
								<div class="space-y-4">
									<div>
										<label class="block text-sm font-medium text-slate-700 mb-2">タグ名</label>
										<input
											type="text"
											name="name"
											required
											bind:value={editingTagName}
											class="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
										/>
									</div>
									<div>
										<label class="block text-sm font-medium text-slate-700 mb-2">カラー</label>
										<input type="hidden" name="color" value={editingTagColor} />
										<div class="flex flex-wrap gap-2">
											{#each colorOptions as color}
												<button
													type="button"
													onclick={() => editingTagColor = color.value}
													class="w-8 h-8 rounded-lg border-2 transition-all {editingTagColor === color.value ? 'border-slate-900 scale-110 ring-2 ring-offset-1 ring-slate-400' : 'border-white shadow-sm'}"
													style="background-color: {color.value}"
													title={color.label}
												></button>
											{/each}
										</div>
									</div>
									<div>
										<label class="block text-sm font-medium text-slate-700 mb-2">プレビュー</label>
										<span
											class="px-4 py-2 text-sm font-semibold rounded-full inline-block"
											style="background-color: {editingTagColor}20; color: {editingTagColor}; border: 2px solid {editingTagColor}"
										>
											{editingTagName}
										</span>
									</div>
								</div>
								<div class="flex gap-3 mt-4 pt-4 border-t border-slate-200">
									<button type="button" onclick={cancelEditTag} class="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-medium">
										キャンセル
									</button>
									<button type="submit" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
										保存
									</button>
								</div>
							</form>
						{:else}
							<!-- Display Mode - Card Style -->
							<div class="group relative bg-white border-2 rounded-2xl p-4 hover:shadow-md transition-all" style="border-color: {tag.color}40">
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<span
											class="px-4 py-2 text-sm font-bold rounded-full inline-block shadow-sm"
											style="background-color: {tag.color}; color: white"
										>
											{tag.name}
										</span>
										<div class="mt-3 flex items-center gap-2">
											<span class="w-4 h-4 rounded-full shadow-inner" style="background-color: {tag.color}"></span>
											<span class="text-xs text-slate-400 font-mono">{tag.color}</span>
										</div>
									</div>
									<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<button
											type="button"
											onclick={() => startEditTag(tag)}
											class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
											title="編集"
										>
											<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
										<form method="POST" action="?/deleteTag" class="inline">
											<input type="hidden" name="tagId" value={tag.id} />
											<button
												type="submit"
												onclick={(e) => { if (!confirm('このタグを削除しますか？')) e.preventDefault(); }}
												class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
												title="削除"
											>
												<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
											</button>
										</form>
									</div>
								</div>
							</div>
						{/if}
					{:else}
						<div class="col-span-full text-center py-12 text-slate-400">
							<svg class="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
							</svg>
							<p>タグがありません</p>
							<p class="text-sm mt-1">「新規タグ」ボタンからタグを作成してください</p>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Email Settings -->
		<div class="bg-white shadow rounded-lg overflow-hidden">
			<div class="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-lg font-bold text-white flex items-center gap-2">📧 Gmailアカウント</h2>
						<p class="mt-1 text-sm text-blue-100">複数のGmailアカウントを登録し、デフォルトの送信元を選べます</p>
					</div>
					<button
						type="button"
						onclick={openNewAccount}
						class="px-4 py-2 bg-white/95 text-indigo-700 rounded-xl hover:bg-white text-sm font-bold flex items-center gap-2 shadow-lg transition-all hover:-translate-y-0.5"
					>
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
						アカウントを追加
					</button>
				</div>
			</div>
			<div class="p-6">
				<!-- 各アクションの結果メッセージ -->
				{#if form?.error && (form?.action === 'saveEmailAccount' || form?.action === 'deleteEmailAccount' || form?.action === 'setDefaultEmail' || form?.action === 'testEmailAccount')}
					<div class="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-xl mb-4 font-medium">⚠️ {form.error}</div>
				{/if}
				{#if form?.success && form?.action === 'testEmailAccount'}
					<div class="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-xl mb-4 font-medium">✅ {form.message}</div>
				{/if}
				{#if form?.success && (form?.action === 'saveEmailAccount' || form?.action === 'deleteEmailAccount' || form?.action === 'setDefaultEmail')}
					<div class="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-xl mb-4 font-medium">
						✅ {form.action === 'saveEmailAccount' ? 'アカウントを保存しました' : form.action === 'deleteEmailAccount' ? 'アカウントを削除しました' : 'デフォルトを変更しました'}
					</div>
				{/if}

				<!-- 追加・編集フォーム -->
				{#if showAccountForm}
					<form method="POST" action="?/saveEmailAccount" class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6 border border-indigo-200">
						<input type="hidden" name="accountId" value={editingAccountId || ''} />
						<h3 class="font-bold text-slate-900 mb-4 flex items-center gap-2">
							{editingAccountId ? '✏️ アカウントを編集' : '➕ 新しいGmailアカウント'}
						</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="md:col-span-2">
								<label for="fromName" class="block text-sm font-medium text-slate-700 mb-1">送信者名（表示名）</label>
								<input type="text" id="fromName" name="fromName" bind:value={accFromName} placeholder="例: 総合心理教育研究所 管理部 佐藤"
									class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
							</div>
							<div class="md:col-span-2">
								<label for="emailAddress" class="block text-sm font-medium text-slate-700 mb-1">メールアドレス <span class="text-red-500">*</span></label>
								<input type="email" id="emailAddress" name="emailAddress" required bind:value={accEmail} placeholder="your-email@gmail.com"
									class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
							</div>
							<div>
								<label for="smtpHost" class="block text-sm font-medium text-slate-700 mb-1">SMTPホスト</label>
								<input type="text" id="smtpHost" name="smtpHost" bind:value={accHost}
									class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
							</div>
							<div>
								<label for="smtpPort" class="block text-sm font-medium text-slate-700 mb-1">SMTPポート</label>
								<input type="number" id="smtpPort" name="smtpPort" bind:value={accPort}
									class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
							</div>
							<div class="md:col-span-2">
								<label for="appPassword" class="block text-sm font-medium text-slate-700 mb-1">
									アプリパスワード（16桁） {#if !editingAccountId}<span class="text-red-500">*</span>{/if}
								</label>
								<input type="password" id="appPassword" name="appPassword" bind:value={accPassword} required={!editingAccountId}
									placeholder={editingAccountId ? '変更する場合のみ入力' : 'xxxx xxxx xxxx xxxx'}
									class="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
								<p class="mt-1 text-xs text-slate-500">{editingAccountId ? '空欄なら現在のパスワードを維持します' : 'Googleアカウントの「アプリパスワード」を使用してください'}</p>
							</div>
						</div>
						<div class="flex gap-3 mt-5">
							<button type="submit" class="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:-translate-y-0.5 transition-all">保存する</button>
							<button type="button" onclick={closeAccountForm} class="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200">キャンセル</button>
						</div>
					</form>
				{/if}

				<!-- アカウント一覧 -->
				<div class="space-y-3">
					{#each data.emailAccounts as acc (acc.id)}
						<div class="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
							<div class="flex items-start justify-between gap-4 flex-wrap">
								<div class="min-w-0">
									<div class="flex items-center gap-2 flex-wrap">
										<span class="font-bold text-slate-900">{acc.from_name || acc.email_address}</span>
										{#if acc.is_default}
											<span class="px-2 py-0.5 text-xs font-bold rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow">デフォルト</span>
										{/if}
										{#if acc.is_active}
											<span class="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700">有効</span>
										{/if}
									</div>
									<p class="text-sm text-indigo-600 font-medium mt-0.5">{acc.email_address}</p>
									<p class="text-xs text-slate-400 mt-0.5">SMTP: {acc.smtp_host}:{acc.smtp_port}</p>
								</div>
								<div class="flex items-center gap-1 flex-wrap text-sm">
									<form method="POST" action="?/testEmailAccount" class="inline">
										<input type="hidden" name="accountId" value={acc.id} />
										<button type="submit" class="px-3 py-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg font-medium">接続テスト</button>
									</form>
									{#if !acc.is_default}
										<form method="POST" action="?/setDefaultEmail" class="inline">
											<input type="hidden" name="accountId" value={acc.id} />
											<button type="submit" class="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg font-medium">デフォルトに設定</button>
										</form>
									{/if}
									<button type="button" onclick={() => openEditAccount(acc)} class="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">編集</button>
									<form method="POST" action="?/deleteEmailAccount" class="inline">
										<input type="hidden" name="accountId" value={acc.id} />
										<button type="submit" onclick={(e) => { if (!confirm('このアカウントを削除しますか？')) e.preventDefault(); }} class="px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-lg font-medium">削除</button>
									</form>
								</div>
							</div>
						</div>
					{:else}
						<div class="text-center py-12 text-slate-400">
							<p class="text-4xl mb-2">📭</p>
							<p>Gmailアカウントが登録されていません</p>
							<p class="text-sm mt-1">「アカウントを追加」から登録してください</p>
						</div>
					{/each}
				</div>

				<!-- アプリパスワード取得ガイド -->
				<div class="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5">
					<h3 class="font-bold text-amber-900 mb-2 flex items-center gap-2">ⓘ Googleアプリパスワードの取得方法</h3>
					<ol class="text-sm text-amber-800 space-y-1.5">
						<li>1. <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener" class="underline font-medium">Googleアカウントのセキュリティ設定を開く</a></li>
						<li>2. 2段階認証を有効にする（まだの場合）</li>
						<li>3. 「アプリパスワード」を選択して新しいパスワードを生成</li>
						<li>4. 生成された16文字のパスワードを使用</li>
					</ol>
				</div>
			</div>
		</div>
	</div>
</AppLayout>
