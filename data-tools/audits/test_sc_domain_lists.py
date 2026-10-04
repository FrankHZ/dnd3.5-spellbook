import unittest
from sc_domain_lists import inventory, name_key


def span(text, x, y, bold=False, font="Body", superscript=False):
    return {"text": text, "font": font, "flags": (16 if bold else 0) | (1 if superscript else 0),
            "size": 6 if superscript else 10, "bbox": [x,y,x+100,y+10], "origin": [x,y+8]}


def page(index, lines):
    return {"page_index":index,"blocks":[{"number":n+10,"lines":[{"spans":s}]} for n,s in enumerate(lines)]}


class DomainInventoryTests(unittest.TestCase):
    def test_uppercase_heading_and_page_continuation(self):
        result=inventory([page(1,[[span("ENVY DOMAIN SPELLS",36,50,font="Pterra")],
                                  [span("1 Alpha:",45,80,bold=True),span("First.",120,80)]]),
                          page(2,[[span("APPENDIX",563,40,font="Pterra")],
                                  [span("2 Beta:",45,60,bold=True),span("Second.",120,60)]])])
        self.assertEqual([(r['owner'],r['level']) for r in result['occurrences']],[('Envy',1),('Envy',2)])

    def test_wrapped_name_and_preserved_superscript_locator(self):
        result=inventory([page(0,[[span("Craft Domain Spells",36,40,font="Pterra")],
                                  [span("9 Fantastic Machine,",45,60,bold=True)],
                                  [span("Greater",66,70,bold=True),span("M",150,70,bold=True,superscript=True),
                                   span(":",160,70,bold=True),span("Creates a machine.",170,70)]])])
        row=result['occurrences'][0]
        self.assertEqual(row['printedName'],'Fantastic Machine, Greater')
        self.assertEqual(row['nameKey'],'greater fantastic machine')
        self.assertEqual(len(row['labelLocators']),2)
        self.assertEqual(row['superscripts'][0]['locator']['spanIndices'],[1])

    def test_planar_alternative_and_full_width_sources(self):
        result=inventory([page(0,[[span("Mechanus Domain Spells",36,40,font="Pterra")],
                                  [span("4 Alpha:",45,60,bold=True),span("First.",120,60)],
                                  [span(" Beta:",45,80,bold=True),span("Second.",120,80)],
                                  [span("SOURCES",36,300,font="Pterra")],
                                  [span("5 Gamma:",292,50,bold=True),span("Third.",380,50)],
                                  [span("D&D Supplements",36,340,bold=True)],
                                  [span("Other authors",292,340,bold=True)]])])
        self.assertEqual([(r['level'],r['printedName']) for r in result['occurrences']],
                         [(4,'Alpha'),(4,'Beta'),(5,'Gamma')])
        self.assertEqual(result['occurrences'][-1]['summaryText'],'Third.')

    def test_digit_in_different_font_and_missing_colon(self):
        result=inventory([page(0,[[span("Wrath Domain Spells",36,40,font="Pterra")],
                                  [span("1",45,60,bold=True),span(" ",50,60),
                                   span("Rhino’s Rush†",54,60,bold=True),span("Double damage.",140,60)]])])
        row=result['occurrences'][0]
        self.assertEqual(row['nameKey'],"rhino's rush")
        self.assertTrue(row['labelComplete'])

    def test_identity_does_not_collapse_slash_or_other_qualifiers(self):
        self.assertNotEqual(name_key('Alpha/Beta'),name_key('Alpha'))
        self.assertNotEqual(name_key('Alpha, Lesser'),name_key('Alpha, Greater'))
        self.assertNotEqual(name_key('Alpha, Swift'),name_key('Alpha'))

    def test_duplicate_pages_rejected(self):
        with self.assertRaisesRegex(ValueError,'Duplicate source page'):
            inventory([page(0,[]),page(0,[])])


if __name__=='__main__':
    unittest.main()
