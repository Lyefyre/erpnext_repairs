frappe.query_reports["Lieferanten-Artikelnummer"] = {
    "filters":
	[{
            "fieldname":"item",
            "label": __("Artikelnummer"),
            "fieldtype": "Link",
	    "options": "Item"
	}]
}
