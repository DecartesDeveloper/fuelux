/*
 * Fuel UX Tree
 * https://github.com/ExactTarget/fuelux
 *
 * Copyright (c) 2014 ExactTarget
 * Licensed under the BSD New license.
 */

// -- BEGIN UMD WRAPPER PREFACE --

// For more information on UMD visit:
// https://github.com/umdjs/umd/blob/master/jqueryPlugin.js

(function (factory) {
	if (typeof define === 'function' && define.amd) {
		// if AMD loader is available, register as an anonymous module.
		define(['jquery'], factory);
	} else {
		// OR use browser globals if AMD is not present
		factory(jQuery);
	}
}(function ($) {
	// -- END UMD WRAPPER PREFACE --

	// -- BEGIN MODULE CODE HERE --

	var old = $.fn.tree;

	// TREE CONSTRUCTOR AND PROTOTYPE

	var Tree = function Tree(element, options) {
		this.$element = $(element);
		this.options = $.extend({}, $.fn.tree.defaults, options);

		if (this.options.itemSelect) {
			this.$element.on('click.fu.tree', '.tree-item', $.proxy(function (ev) {
				this.selectItem(ev.currentTarget);
			}, this));
		}

		this.$element.on('click.fu.tree', '.tree-branch-name', $.proxy(function (ev) {
			this.toggleFolder(ev.currentTarget);
		}, this));

		if (this.options.folderSelect) {
			this.$element.off('click.fu.tree', '.tree-branch-name');
			this.$element.on('click.fu.tree', '.icon-caret', $.proxy(function (ev) {
				this.toggleFolder($(ev.currentTarget).parent());
			}, this));
			this.$element.on('click.fu.tree', '.tree-branch-name', $.proxy(function (ev) {
				this.selectFolder($(ev.currentTarget));
			}, this));
		}

		this.render();
	};

	Tree.prototype = {
		constructor: Tree,

		destroy: function destroy() {
			// any external bindings [none]
			// empty elements to return to original markup
			this.$element.find("li:not([data-template])").remove();

			this.$element.remove();
			// returns string of markup
			return this.$element[0].outerHTML;
		},

		render: function render() {
			this.populate(this.$element);
		},

		populate: function populate($el) {
			var self = this;
			var $parent = ($el.hasClass('tree')) ? $el : $el.parent();
			var loader = $parent.find('.tree-loader:eq(0)');
			var treeData = $parent.data();

			loader.removeClass('hide');
			this.options.dataSource(treeData ? treeData : {}, function (items) {
				loader.addClass('hide');

				$.each(items.data, function (index, value) {
					var $entity;

					if (value.type === 'folder') {
						$entity = self.$element.find('[data-template=treebranch]:eq(0)').clone().removeClass('hide').removeData('template');
						$entity.data(value);
						$entity.find('.tree-branch-name > .tree-label').html(value.text || value.name);
					} else if (value.type === 'item') {
						$entity = self.$element.find('[data-template=treeitem]:eq(0)').clone().removeClass('hide').removeData('template');
						$entity.find('.tree-item-name > .tree-label').html(value.text || value.name);
						$entity.data(value);
					}

					// Decorate $entity with data or other attributes making the
					// element easily accessable with libraries like jQuery.
					//
					// Values are contained within the object returned
					// for folders and items as attr:
					//
					// {
					//     text: "An Item",
					//     type: 'item',
					//     attr = {
					//         'classes': 'required-item red-text',
					//         'data-parent': parentId,
					//         'guid': guid,
					//         'id': guid
					//     }
					// };
					//
					// the "name" attribute is also supported but is deprecated for "text".

					// add attributes to tree-branch or tree-item
					var attr = value['attr'] || value.dataAttributes || [];
					$.each(attr, function (key, value) {
						switch (key) {
							case 'cssClass':
							case 'class':
							case 'className':
								$entity.addClass(value);
								break;

							// allow custom icons
							case 'data-icon':
								$entity.find('.icon-item').removeClass().addClass('icon-item ' + value);
								$entity.attr(key, value);
								break;

							// ARIA support
							case 'id':
								$entity.attr(key, value);
								$entity.attr('aria-labelledby', value + '-label');
								$entity.find('.tree-branch-name > .tree-label').attr('id', value + '-label');
								break;

							// style, data-*
							default:
								$entity.attr(key, value);
								break;
						}
					});

					// add child nodes
					if ($el.hasClass('tree-branch-header')) {
						$parent.find('.tree-branch-children:eq(0)').append($entity);
					} else {
						$el.append($entity);
					}
				});

				// return newly populated folder
				self.$element.trigger('loaded.fu.tree', $parent);
			});
		},

		selectItem: function selectItem(el) {
			if (!this.options.itemSelect) return;
			var $el = $(el);
			var selData = $el.data();
			var $all = this.$element.find('.tree-selected');
			var data = [];
			var $icon = $el.find('.icon-item');

			if (this.options.multiSelect) {
				$.each($all, function (index, value) {
					var $val = $(value);
					if ($val[0] !== $el[0]) {
						data.push($(value).data());
					}
				});
			} else if ($all[0] !== $el[0]) {
				$all.removeClass('tree-selected')
					.find('.glyphicon').removeClass('glyphicon-ok').addClass('fueluxicon-bullet');
				data.push(selData);
			}

			var eventType = 'selected';
			if ($el.hasClass('tree-selected')) {
				eventType = 'deselected';
				$el.removeClass('tree-selected');
				if ($icon.hasClass('glyphicon-ok') || $icon.hasClass('fueluxicon-bullet')) {
					$icon.removeClass('glyphicon-ok').addClass('fueluxicon-bullet');
				}

			} else {
				$el.addClass ('tree-selected');
				// add tree dot back in
				if ($icon.hasClass('glyphicon-ok') || $icon.hasClass('fueluxicon-bullet')) {
					$icon.removeClass('fueluxicon-bullet').addClass('glyphicon-ok');
				}

				if (this.options.multiSelect) {
					data.push(selData);
				}

			}

			this.$element.trigger(eventType + '.fu.tree', {
				target: selData,
				selected: data
			});

			// Return new list of selected items, the item
			// clicked, and the type of event:
			$el.trigger('updated.fu.tree', {
				selected: data,
				item: $el,
				eventType: eventType
			});
		},

		openFolder: function openFolder(el, ignoreRedundantOpens) {
			var $el = $(el);

			//don't break the API :| (make this functionally the same as calling 'toggleFolder')
			if (!ignoreRedundantOpens && $el.find('.glyphicon-folder-open').length && !this.options.ignoreRedundantOpens) {
				this.closeFolder(el);
			}

			var $branch = $el.closest('.tree-branch');
			var $treeFolderContent = $branch.find('.tree-branch-children');
			var $treeFolderContentFirstChild = $treeFolderContent.eq(0);

			//take care of the styles
			$branch.addClass('tree-open');
			$branch.attr('aria-expanded', 'true');
			$treeFolderContentFirstChild.removeClass('hide');
			$branch.find('> .tree-branch-header .icon-folder').eq(0)
				.removeClass('glyphicon-folder-close')
				.addClass('glyphicon-folder-open');

			//add the children to the folder
			if (!$treeFolderContent.children().length) {
				this.populate($treeFolderContent);
			}

			this.$element.trigger('opened.fu.tree', $branch.data());
		},

		closeFolder: function closeFolder(el) {
			var $el = $(el);
			var $branch = $el.closest('.tree-branch');
			var $treeFolderContent = $branch.find('.tree-branch-children');
			var $treeFolderContentFirstChild = $treeFolderContent.eq(0);

			//take care of the styles
			$branch.removeClass('tree-open');
			$branch.attr('aria-expanded', 'false');
			$treeFolderContentFirstChild.addClass('hide');
			$branch.find('> .tree-branch-header .icon-folder').eq(0)
				.removeClass('glyphicon-folder-open')
				.addClass('glyphicon-folder-close');

			// remove chidren if no cache
			if (!this.options.cacheItems) {
				$treeFolderContentFirstChild.empty();
			}

			this.$element.trigger('closed.fu.tree', $branch.data());
		},

		toggleFolder: function toggleFolder(el) {
			var $el = $(el);

			if ($el.find('.glyphicon-folder-close').length) {
				this.openFolder(el);
			} else if ($el.find('.glyphicon-folder-open').length) {
				this.closeFolder(el);
			}
		},

		selectFolder: function selectFolder(clickedElement) {
			if (!this.options.folderSelect) return;
			var $clickedElement = $(clickedElement);
			var $clickedBranch = $clickedElement.closest('.tree-branch');
			var $selectedBranch = this.$element.find('.tree-branch.tree-selected');
			var clickedData = $clickedBranch.data();
			var selectedData = [];
			var eventType = 'selected';

			// select clicked item
			if ($clickedBranch.hasClass('tree-selected')) {
				eventType = 'deselected';
				$clickedBranch.removeClass('tree-selected');
			} else {
				$clickedBranch.addClass('tree-selected');
			}

			if (this.options.multiSelect) {
				// get currently selected
				$selectedBranch = this.$element.find('.tree-branch.tree-selected');

				$.each($selectedBranch, function (index, value) {
					var $value = $(value);
					if ($value[0] !== $clickedElement[0]) {
						selectedData.push($(value).data());
					}
				});

			} else if ($selectedBranch[0] !== $clickedElement[0]) {
				$selectedBranch.removeClass('tree-selected');

				selectedData.push(clickedData);
			}

			this.$element.trigger(eventType + '.fu.tree', {
				target: clickedData,
				selected: selectedData
			});

			// Return new list of selected items, the item
			// clicked, and the type of event:
			$clickedElement.trigger('updated.fu.tree', {
				selected: selectedData,
				item: $clickedElement,
				eventType: eventType
			});
		},

		selectedItems: function selectedItems() {
			var $sel = this.$element.find('.tree-selected');
			var data = [];

			$.each($sel, function (index, value) {
				data.push($(value).data());
			});
			return data;
		},

		// collapses open folders
		collapse: function collapse() {
			var self = this;
			var reportedClosed = [];

			var closedReported = function closedReported(event, closed) {
				reportedClosed.push(closed);

				if (self.$element.find(".tree-branch.tree-open:not('.hide')").length === 0) {
					self.$element.trigger('closedAll.fu.tree', {
						tree: self.$element,
						reportedClosed: reportedClosed
					});
					self.$element.off('loaded.fu.tree', self.$element, closedReported);
				}
			};

			//trigger callback when all folders have reported opened
			self.$element.on('closed.fu.tree', closedReported);

			self.$element.find(".tree-branch.tree-open:not('.hide')").each(function () {
				self.closeFolder(this);
			});
		},

		//disclose visible will only disclose visible tree folders
		discloseVisible: function discloseVisible() {
			var self = this;
			var $openableFolders = self.$element.find(".tree-branch:not('.tree-open, .hide')");
			var reportedOpened = [];

			var openReported = function openReported(event, opened) {
				reportedOpened.push(opened);

				if (reportedOpened.length === $openableFolders.length) {
					self.$element.trigger('disclosedVisible.fu.tree', {
						tree: self.$element,
						reportedOpened: reportedOpened
					});
					/*
					* Unbind the `openReported` event. `discloseAll` may be running and we want to reset this
					* method for the next iteration.
					*/
					self.$element.off('loaded.fu.tree', self.$element, openReported);
				}
			};

			//trigger callback when all folders have reported opened
			self.$element.on('loaded.fu.tree', openReported);

			// open all visible folders
			self.$element.find(".tree-branch:not('.tree-open, .hide')").each(function triggerOpen() {
				self.openFolder($(this).find('.tree-branch-header'), true);
			});
		},

		/**
		* Disclose all will keep listening for `loaded.fu.tree` and if `$(tree-el).data('keep-disclosing')`
		* is `true` (defaults to `true`) it will attempt to disclose any new closed folders than were
		* loaded in during the last disclosure.
		*/
		discloseAll: function discloseAll() {
			var self = this;

			//first time
			if (typeof self.$element.data('disclosures') === 'undefined') {
				self.$element.data('disclosures', 0);
				self.$element.data('keep-disclosing', true);
			}

			//stop the recursion if they throw the kill switch, or if there isn't anything left to do
			if (self.$element.data('keep-disclosing') && self.$element.find(".tree-branch:not('.tree-open, .hide')").length !== 0) {
				/*
				* give the dev a hook to listen for exceeding disclusure limit `exceededDisclosuresLimit`.
				* We can't do `disclosures >= upperLimit` because then if they call it again it will
				* exit immediately unless they "reset the machine". If instead we check to see if
				* `disclosures` is a multiple of `upperLimit`, it will run exactly `upperLimit` times
				* while preserving (as an accurate data point for the dev) the number of `disclosures`
				* that have occurred on this element since page load
				*/
				self.$element.data('disclosures', self.$element.data('disclosures') + 1);
				if (self.options.disclosuresUpperLimit >= 1 && (self.$element.data('disclosures') % self.options.disclosuresUpperLimit) === 0) {
					/*
					* This trigger will fire at the beginning of the upper limit recursion layer
					* (prior to the calling of `discloseVisible()`). So, if you set the
					* `disclosuresUpperLimit` to 4, this trigger will fire at the _apparent end_
					* of round 3, just before round 4 occurs. This could theoretically give you time
					* to prompt the user if they'd like to continue waiting or not before round 4
					* ends, changing whether the recursion gets killed or not.
					*/
					self.$element.trigger('exceededDisclosuresLimit.fu.tree', {
						tree: self.$element,
						disclosures: self.$element.data('disclosures')
					});
				} else if (self.options.disclosuresUpperLimit >= 1 && self.$element.data('disclosures') > self.options.disclosuresUpperLimit) {
					/*
					* Give the dev an out at each execution following the upper limit execution.
					* If this is not the first time `discloseAll` has been called, this will
					* likely fire _each round_ because the tree remembers the total disclosures since
					* page load, _even if you've called `closeAll`. In order to prevent that, you will
					* need to manually reset `disclosures` if you call `closeAll`:
					*    $tree.data('disclosures', 0);
					*/
					self.$element.trigger('exceededDisclosuresLimit.fu.tree', {
						tree: self.$element,
						disclosures: self.$element.data('disclosures')
					});
				}

				/*
				* A new branch that is closed might be loaded in, make sure those get handled too.
				* This attachment needs to occur before calling `discloseVisible` to make sure that
				* if the execution of `discloseVisible` happens _super fast_ (as it does in our QUnit tests
				* this will still be called. However, make sure this only gets called _once_, because
				* otherwise, every single time we go through this loop, _another_ event will be bound
				* and then when the trigger happens, this will fire N times, where N equals the number
				* of recursive `discloseAll` executions (instead of just one)
				*/
				self.$element.one('disclosedVisible.fu.tree', function () {
					self.discloseAll();
				});

				/*
				* If the page is very fast, calling this first will cause `disclosedVisible.fu.tree` to not
				* be bound in time to be called, so, we need to call this last so that the things bound
				* and triggered above can have time to take place before the next execution of the
				* `discloseAll` method.
				*/
				self.discloseVisible();
			} else {
				self.$element.trigger('disclosedAll.fu.tree', {
					tree: self.$element,
					disclosures: self.$element.data('disclosures')
				});
				/*
				* we're all done, reset `keep-disclosing` in case they want to call `discloseAll` again.
				* (Like, if the `discloseAll` function was killed for exceeding the disclosure limit, but
				* now they want to start it back up again). Don't reset `disclosures` here because that
				* would be lying.
				*/
				self.$element.data('keep-disclosing', true);
			}
		}
	};

	//alias for collapse for consistency. "Collapse" is an ambiguous term (collapse what? All? One specific branch?)
	Tree.prototype.closeAll = Tree.prototype.collapse;

	// TREE PLUGIN DEFINITION

	$.fn.tree = function tree(option) {
		var args = Array.prototype.slice.call(arguments, 1);
		var methodReturn;

		var $set = this.each(function () {
			var $this = $(this);
			var data = $this.data('fu.tree');
			var options = typeof option === 'object' && option;

			if (!data) {
				$this.data('fu.tree', (data = new Tree(this, options)));
			}

			if (typeof option === 'string') {
				methodReturn = data[option].apply(data, args);
			}
		});

		return (methodReturn === undefined) ? $set : methodReturn;
	};

	$.fn.tree.defaults = {
		dataSource: function dataSource(options, callback) {},
		multiSelect: false,
		cacheItems: true,
		folderSelect: true,
		itemSelect: true,
		/*
		* currently calling "open" again on a folder will close it. Setting
		* `ignoreRedundantOpens` to `true` will make the folder instead ignore
		* the redundant call and stay open.
		*/
		ignoreRedundantOpens: false,
		/*
		* this is not necessarily indicative of how many layers deep the tree goes,
		* only how many times `discloseAll` should be called before a warning trigger
		* is fired for the dev to hook into. `discloseAll` will continue running
		* after this many recursions unles the dev manually kilss it by setting
		* `keep-disclosing` to `false`:
		*
		*    $tree.one('exceededDisclosuresLimit.fu.tree', function () {
		*        $tree.data('keep-disclosing', false);
		*    });
		*
		* Setting `disclusuresUpperLimiet` to `0` means this trigger will never fire.
		* The true hard the upper limit is merely be the browser's ability to load new items
		* (i.e. it will keep loading until the browser falls over and dies). On the
		* Fuel UX `index.html` page, the point at which the page became super slow
		* (enough to seem almost unresponsive) was `4`, meaning 256 folders had
		* been opened, and 1024 were attempting to open.
		*/
		disclosuresUpperLimit: 6
	};

	$.fn.tree.Constructor = Tree;

	$.fn.tree.noConflict = function () {
		$.fn.tree = old;
		return this;
	};


	// NO DATA-API DUE TO NEED OF DATA-SOURCE

	// -- BEGIN UMD WRAPPER AFTERWORD --
}));
// -- END UMD WRAPPER AFTERWORD --
