// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

frappe.provide("frappe.ui.toolbar");

frappe.ui.toolbar.Toolbar = Class.extend({
	init: function() {
		var header = $('header').append(frappe.render_template("navbar", {
			avatar: frappe.avatar(frappe.session.user)
		}));

		this.setup_sidebar();

		$(document).on("notification-update", function() {
			frappe.ui.notifications.update_notifications();
		});

		$('.dropdown-toggle').dropdown();

		this.setup_help();

		$(document).trigger('toolbar_setup');

		// clear all custom menus on page change
		$(document).on("page-change", function() {
			$("header .navbar .custom-menu").remove();
		});

		frappe.search.setup();
	},

	setup_sidebar: function () {

		var header = $('header');
		header.find(".toggle-sidebar").on("click", function () {
			var layout_side_section = $('.layout-side-section');
			var overlay_sidebar = layout_side_section.find('.overlay-sidebar');

			overlay_sidebar.addClass('opened');
			overlay_sidebar.find('.reports-dropdown')
				.removeClass('dropdown-menu')
				.addClass('list-unstyled');
			overlay_sidebar.find('.dropdown-toggle')
				.addClass('text-muted').find('.caret')
				.addClass('hidden-xs hidden-sm');

			$('<div class="close-sidebar">').hide().appendTo(layout_side_section).fadeIn();

			var scroll_container = $('html');
			scroll_container.css("overflow-y", "hidden");

			layout_side_section.find(".close-sidebar").on('click', close_sidebar);
			layout_side_section.on("click", "a", close_sidebar);

			function close_sidebar(e) {
				scroll_container.css("overflow-y", "");

				layout_side_section.find(".close-sidebar").fadeOut(function() {
					overlay_sidebar.removeClass('opened')
						.find('.dropdown-toggle')
						.removeClass('text-muted');
					overlay_sidebar.find('.reports-dropdown')
						.addClass('dropdown-menu');
				});
			}
		});
	},

	setup_help: function () {

		$(".dropdown-help .dropdown-toggle").on("click", function () {
			$(".dropdown-help input").focus();
		});

		$(".dropdown-help .dropdown-menu").on("click", "input, button", function (e) {
			e.stopPropagation();
		});

		$("#input-help").on("keydown", function (e) {
			if(e.which == 13) {
				var keywords = $(this).val();
				show_help_results(keywords);
				$(this).val("");
			}
		});

		$("#input-help + span").on("click", function () {
			var keywords = $(this).val();
			show_help_results(keywords);
			$(this).val("");
		});

		$(document).on("page-change", function () {
			var $help_links = $(".dropdown-help #help-links");
			$help_links.html("");

			var route = frappe.get_route_str();
			var breadcrumbs = route.split("/");

			var links = [];
			for (var i = 0; i < breadcrumbs.length; i++) {
				var r = route.split("/", i + 1);
				var key = r.join("/");
				var help_links = frappe.help.help_links[key] || [];
				links = $.merge(links, help_links);
			}

			if(links.length === 0) {
				$help_links.next().hide();
			}
			else {
				$help_links.next().show();
			}

			for (var i = 0; i < links.length; i++) {
				var link = links[i];
				var url = link.url;
				var data_path = url.slice(url.indexOf('/user'));
				if(data_path.lastIndexOf('.')){
					data_path = data_path.slice(0, data_path.lastIndexOf('.'));
				}

				$("<a>", {
					href: link.url,
					text: link.label,
					target: "_blank",
					"data-path": data_path
				}).appendTo($help_links);
			}

			$('.dropdown-help .dropdown-menu').on('click', 'a', show_results);
		});

		var $help_modal = frappe.get_modal("Help", "");
		$help_modal.addClass('help-modal');

		var $result_modal = frappe.get_modal("", "");
		$result_modal.addClass("help-modal");

		$(document).on("click", ".help-modal a", show_results);

		function show_help_results(keywords) {
			frappe.call({
				method: "frappe.utils.help.get_help",
				args: {
					text: keywords
				},
				callback: function (r) {
					var results = r.message || [];
					var result_html = "<h4 style='margin-bottom: 25px'>Showing results for '" + keywords + "' </h4>";

					for (var i = 0, l = results.length; i < l; i++) {
						var title = results[i][0];
						var intro = results[i][1];
						var fpath = results[i][2];

						result_html +=	"<div class='search-result'>" +
											"<a href='#' class='h4' data-path='"+fpath+"'>" + title + "</a>" +
											"<p>" + intro + "</p>" +
										"</div>";
					}

					if(results.length === 0) {
						result_html += "<p class='padding'>No results found</p>";
					}

					$help_modal.find('.modal-body').html(result_html);
					$help_modal.modal('show');
				}
			});
		}

		function show_results(e) {
			//edit links
			href = e.target.href;
			if(href.indexOf('blob') > 0) {
				window.open(href, '_blank');
			}

			var converter = new Showdown.converter();
			var path = $(this).attr("data-path");
			if(path) {
				e.preventDefault();
				frappe.call({
					method: "frappe.utils.help.get_help_content",
					args: {
						path: path
					},
					callback: function (r) {
						if(r.message && r.message.title) {
							$result_modal.find('.modal-title').html("<span>"
								+ r.message.title + "</span>");
							$result_modal.find('.modal-body').html(r.message.content);
							$result_modal.modal('show');
						}
					}
				});
			}
		}
	}
});

$.extend(frappe.ui.toolbar, {
	add_dropdown_button: function(parent, label, click, icon) {
		var menu = frappe.ui.toolbar.get_menu(parent);
		if(menu.find("li:not(.custom-menu)").length && !menu.find(".divider").length) {
			frappe.ui.toolbar.add_menu_divider(menu);
		}

		return $('<li class="custom-menu"><a><i class="icon-fixed-width '
			+icon+'"></i> '+label+'</a></li>')
			.insertBefore(menu.find(".divider"))
			.find("a")
			.click(function() {
				click.apply(this);
			});
	},
	get_menu: function(label) {
		return $("#navbar-" + label.toLowerCase());
	},
	add_menu_divider: function(menu) {
		menu = typeof menu == "string" ?
			frappe.ui.toolbar.get_menu(menu) : menu;

		$('<li class="divider custom-menu"></li>').prependTo(menu);
	}
});

frappe.ui.toolbar.clear_cache = function() {
	frappe.assets.clear_local_storage();
	$c('frappe.sessions.clear',{},function(r,rt){
		if(!r.exc) {
			show_alert(r.message);
			location.reload(true);
		}
	});
	return false;
}

frappe.ui.toolbar.download_backup = function() {
	msgprint(__("Your download is being built, this may take a few moments..."));
	return $c('frappe.utils.backups.get_backup',{},function(r,rt) {});
	return false;
}

frappe.ui.toolbar.show_about = function() {
	try {
		frappe.ui.misc.about();
	} catch(e) {
		console.log(e);
	}
	return false;
}
