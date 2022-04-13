import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {

		// Create the panel object
		const panel = await joplin.views.panels.create('panel_novelwriter');

		// Set some initial content while the TOC is being created
		await joplin.views.panels.setHtml(panel, 'Loading...');

		// Later, this is where you'll want to update the TOC
		async function getNotes(parent){
			// Load all the notes
			var allTodos = [];
			let pageNum = 0;
			do {
				var response = await joplin.data.get(['folders',parent,'notes'], {
					fields: ['id', 'title', 'order', 'body', 'parent_id'], 
					type: 'note',
					order_by: 'order',
					order_dir: 'DESC',
					page: pageNum++,
				})
				allTodos = allTodos.concat(response.items)
			} while (response.has_more)

			for(const note of allTodos){
				var text = note.body.replace(/(<([^>]+)>)/gi, "");
				text = text.replace(/[^A-Za-z]\s+/g, " ");
				var words = text.trim().split(" ")
				note.word_count = words.length; //wordsCounter(note.body_html, { isHtml: true }).wordsCount;

				note.status = await getTag(note.id,'status');
			}

			return allTodos
		}

		async function getTag(id,key){
			var response = await joplin.data.get(['notes',id,'tags'],{});
			var value = '';
			response.items.forEach(function (tag){
				tag = tag.title.split(':');
				if(tag[0] == key){
					value = tag[1];
				}
			})
			return value;
		}

		async function updateTocView() {
			// Get the current note from the workspace.
			const note = await joplin.workspace.selectedNote();
			var panelHTML = `
				<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">
				<div class="container-fluid mt-3">
				<div class="row"><div class="col-12">
				<h4>Novel Stats</h4>`;
			var totalWordCount = 0;
			// Keep in mind that it can be `null` if nothing is currently selected!
			if (note) {
				var gt = await getNotes(note.parent_id);
				panelHTML = panelHTML + `
					<table class="table table-striped"><tr><th>Chapter</th><th>WC</th><th>S</th></tr>
				`;
				for(const note of gt) {
					panelHTML = panelHTML + `<tr>
									<td>` + note.title + `</td>
									<td>` + note.word_count + `</td>
									<td>` + note.status + `</td>
								</tr>`;
					totalWordCount = totalWordCount + note.word_count;
				}
				panelHTML = panelHTML + `<tr>
									<td><strong>Total Word Count</strong></td>
									<td>` + totalWordCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + `</td>
									<td>&nbsp;</td>
								</tr>`;
			} else {
				panelHTML = panelHTML + '<p>No chapters found.</p>';
			}

			panelHTML = panelHTML + '</div></div></div>';
			joplin.views.panels.setHtml(panel,panelHTML);
		}

		// This event will be triggered when the user selects a different note
		await joplin.workspace.onNoteSelectionChange(() => {
			updateTocView();
		});

		// This event will be triggered when the content of the note changes
		// as you also want to update the TOC in this case.
		await joplin.workspace.onNoteChange(() => {
			updateTocView();
		});

		// Also update the TOC when the plugin starts
		updateTocView();
	},
});
