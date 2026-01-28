<script lang="ts">
	let { content = '' }: { content: string } = $props();

	// Format a single line of text (non-URL)
	function formatLine(line: string): string {
		if (line.startsWith('💡 ')) return `<div class="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg my-3"><span class="text-2xl">💡</span><span class="text-amber-800 flex-1">${line.slice(2)}</span></div>`;
		if (line.startsWith('📌 ')) return `<div class="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg my-3"><span class="text-2xl">📌</span><span class="text-red-800 flex-1">${line.slice(2)}</span></div>`;
		if (line.startsWith('ℹ️ ')) return `<div class="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg my-3"><span class="text-2xl">ℹ️</span><span class="text-blue-800 flex-1">${line.slice(3)}</span></div>`;
		if (line.startsWith('✅ ')) return `<div class="flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg my-3"><span class="text-2xl">✅</span><span class="text-green-800 flex-1">${line.slice(2)}</span></div>`;
		if (line.startsWith('⚠️ ')) return `<div class="flex gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg my-3"><span class="text-2xl">⚠️</span><span class="text-orange-800 flex-1">${line.slice(3)}</span></div>`;
		if (line.startsWith('🚀 ')) return `<div class="flex gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg my-3"><span class="text-2xl">🚀</span><span class="text-purple-800 flex-1">${line.slice(2)}</span></div>`;
		if (line.startsWith('### ')) return `<h3 class="text-lg font-semibold text-slate-800 mt-6 mb-3">${line.slice(4)}</h3>`;
		if (line.startsWith('## ')) return `<h2 class="text-xl font-semibold text-slate-800 mt-6 mb-3">${line.slice(3)}</h2>`;
		if (line.startsWith('# ')) return `<h1 class="text-2xl font-bold text-slate-900 mt-6 mb-3">${line.slice(2)}</h1>`;
		if (line.startsWith('• ')) return `<div class="flex gap-3 ml-4 my-1"><span class="text-slate-400">•</span><span>${line.slice(2)}</span></div>`;
		if (line.startsWith('☐ ')) return `<div class="flex gap-3 ml-4 my-1"><span class="text-slate-400 text-lg">☐</span><span>${line.slice(2)}</span></div>`;
		if (line.startsWith('☑ ')) return `<div class="flex gap-3 ml-4 my-1"><span class="text-green-600 text-lg">☑</span><span class="line-through text-slate-400">${line.slice(2)}</span></div>`;
		if (line.match(/^\d+\. /)) return `<div class="flex gap-3 ml-4 my-1"><span class="text-slate-500 font-medium">${line.match(/^\d+/)?.[0]}.</span><span>${line.replace(/^\d+\. /, '')}</span></div>`;
		if (line.startsWith('> ')) return `<blockquote class="border-l-4 border-slate-300 pl-4 py-2 text-slate-600 italic my-3 bg-slate-50 rounded-r-lg">${line.slice(2)}</blockquote>`;
		if (line === '---') return `<hr class="my-6 border-slate-200" />`;
		if (line === '') return `<div class="h-3"></div>`;
		return `<p class="my-2 text-slate-700 leading-relaxed">${line}</p>`;
	}

	// Parse content into blocks (text or URL) for inline rendering
	type ContentBlock = { type: 'text'; html: string } | { type: 'url'; url: string; domain: string; isYoutube: boolean; youtubeId?: string };

	function parseContentBlocks(text: string): ContentBlock[] {
		if (!text) return [];
		const urlPattern = /^https?:\/\/[^\s]+$/;
		const blocks: ContentBlock[] = [];
		let textBuffer: string[] = [];

		const flushTextBuffer = () => {
			if (textBuffer.length > 0) {
				const html = textBuffer.map(formatLine).join('');
				if (html.replace(/<div class="h-3"><\/div>/g, '').trim()) {
					blocks.push({ type: 'text', html });
				}
				textBuffer = [];
			}
		};

		for (const line of text.split('\n')) {
			const trimmed = line.trim();
			if (urlPattern.test(trimmed)) {
				flushTextBuffer();
				try {
					const urlObj = new URL(trimmed);
					const isYoutube = urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be');
					blocks.push({
						type: 'url',
						url: trimmed,
						domain: urlObj.hostname.replace('www.', ''),
						isYoutube,
						youtubeId: isYoutube ? extractYouTubeId(trimmed) || undefined : undefined
					});
				} catch {
					blocks.push({ type: 'url', url: trimmed, domain: trimmed, isYoutube: false });
				}
			} else {
				textBuffer.push(line);
			}
		}
		flushTextBuffer();
		return blocks;
	}

	function extractYouTubeId(text: string): string | null {
		if (!text) return null;
		const patterns = [
			/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
			/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
		];
		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match) return match[1];
		}
		return null;
	}

	// Get domain icon/emoji based on common services
	function getDomainIcon(domain: string): string {
		if (domain.includes('youtube')) return '🎬';
		if (domain.includes('twitter') || domain.includes('x.com')) return '𝕏';
		if (domain.includes('instagram')) return '📸';
		if (domain.includes('facebook')) return '👤';
		if (domain.includes('github')) return '💻';
		if (domain.includes('figma')) return '🎨';
		if (domain.includes('notion')) return '📝';
		if (domain.includes('slack')) return '💬';
		if (domain.includes('drive.google') || domain.includes('docs.google')) return '📄';
		if (domain.includes('sheets.google')) return '📊';
		if (domain.includes('slides.google')) return '📽️';
		if (domain.includes('google')) return '🔍';
		if (domain.includes('amazon') || domain.includes('amzn')) return '📦';
		if (domain.includes('spotify')) return '🎵';
		if (domain.includes('netflix')) return '🎥';
		if (domain.includes('zoom')) return '📹';
		if (domain.includes('linkedin')) return '💼';
		if (domain.includes('tiktok')) return '🎵';
		if (domain.includes('pinterest')) return '📌';
		return '🔗';
	}

	let blocks = $derived(parseContentBlocks(content));
</script>

{#if blocks.length > 0}
	<div class="space-y-3">
		{#each blocks as block}
			{#if block.type === 'text'}
				<div class="prose prose-slate max-w-none">
					{@html block.html}
				</div>
			{:else if block.type === 'url'}
				{#if block.isYoutube && block.youtubeId}
					<div class="rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-black">
						<iframe width="100%" height="360" src="https://www.youtube.com/embed/{block.youtubeId}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
						<a href={block.url} target="_blank" rel="noopener noreferrer" class="block px-4 py-2 bg-slate-900 hover:bg-slate-800 transition-colors">
							<div class="flex items-center gap-2">
								<span class="text-sm">🎬</span>
								<span class="text-xs text-slate-300 truncate flex-1">{block.domain}</span>
								<svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
								</svg>
							</div>
						</a>
					</div>
				{:else}
					<a href={block.url} target="_blank" rel="noopener noreferrer" class="block rounded-xl border border-slate-200 bg-white hover:shadow-md hover:border-blue-300 transition-all group">
						<div class="p-4 flex items-center gap-3">
							<div class="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-2xl shrink-0">{getDomainIcon(block.domain)}</div>
							<div class="flex-1 min-w-0">
								<p class="text-base font-medium text-slate-900 truncate">{block.domain}</p>
								<p class="text-sm text-slate-400 truncate">{block.url.replace(/^https?:\/\//, '').slice(0, 60)}...</p>
							</div>
							<svg class="w-5 h-5 text-slate-300 group-hover:text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
							</svg>
						</div>
					</a>
				{/if}
			{/if}
		{/each}
	</div>
{:else}
	<div class="text-center py-12">
		<p class="text-slate-400 italic">内容がありません</p>
	</div>
{/if}
