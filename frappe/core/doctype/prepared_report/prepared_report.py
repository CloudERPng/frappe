# -*- coding: utf-8 -*-
# Copyright (c) 2018, Frappe Technologies and contributors
# For license information, please see license.txt


from __future__ import unicode_literals
import base64
import gzip
import json

import frappe
from frappe.model.document import Document
from frappe.utils.background_jobs import enqueue
from frappe.desk.query_report import generate_report_result
from frappe.utils.file_manager import save_file, remove_all
from frappe.desk.form.load import get_attachments
from frappe.utils.file_manager import download_file


class PreparedReport(Document):

	def before_insert(self):
		self.status = "Queued"
		self.report_start_time = frappe.utils.now()

	def after_insert(self):
		enqueue(
			run_background,
			instance=self, timeout=6000
		)

	def on_trash(self):
		remove_all("PreparedReport", self.name, from_delete=True)


def run_background(instance):
	report = frappe.get_doc("Report", instance.ref_report_doctype)
	result = generate_report_result(report, filters=json.loads(instance.filters), user=instance.owner)
	create_json_gz_file(result['result'], 'Prepared Report', instance.name)

	instance.status = "Completed"
	instance.columns = json.dumps(result["columns"])
	instance.report_end_time = frappe.utils.now()
	instance.save()

	frappe.publish_realtime(
		'report_generated',
		{"report_name": instance.report_name},
		user=frappe.session.user
	)


def create_json_gz_file(data, dt, dn):
	# Storing data in CSV file causes information loss
	# Reports like P&L Statement were completely unsuable because of this
	json_filename = '{0}.json.gz'.format(frappe.utils.data.format_datetime(frappe.utils.now(), "Y-m-d-H:M"))
	encoded_content = frappe.safe_encode(json.dumps(data))

	# GZip compression seems to reduce storage requirements by 80-90%
	compressed_content = gzip.compress(encoded_content)
	save_file(
		fname=json_filename,
		content=compressed_content,
		dt=dt,
		dn=dn,
		folder=None,
		is_private=False)


@frappe.whitelist()
def download_attachment(dn):
	attachment = get_attachments("Prepared Report", dn)[0]
	download_file(attachment.file_url)
