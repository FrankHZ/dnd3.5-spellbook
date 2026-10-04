import unittest
from sc_domain_powers import inventory_powers
from test_sc_domain_lists import page, span


class DomainPowerTests(unittest.TestCase):
    def test_requirement_and_power_are_separate_from_spells(self):
        result = inventory_powers([page(0, [
            [span("ABYSS DOMAIN", 36, 40, font="Pterra")],
            [span("Requirement: Must be chaotic evil.", 36, 60)],
            [span("Granted Power (Su): Once per day", 36, 80)],
            [span("for 5 rounds; cannot end early.", 36, 100)],
            [span("Abyss Domain Spells", 36, 120, font="Pterra")],
            [span("1 Alpha: Wrong content.", 36, 140)],
        ])])
        row = result["domains"][0]
        self.assertEqual(row["requirementEnglish"], "Requirement: Must be chaotic evil.")
        self.assertEqual(len(row["grantedPowerLines"]), 2)
        self.assertNotIn("Wrong content", row["grantedPowerEnglish"])
        self.assertEqual(row["grantedPowerLines"][1]["locator"]["blockNumber"], 13)

    def test_column_and_page_continuation_preserves_raw_hyphen(self):
        result = inventory_powers([page(0, [
            [span("ALPHA DOMAIN", 36, 40, font="Pterra")],
            [span("Granted Power: con-", 36, 80)],
            [span("tinues", 292, 40)],
        ]), page(1, [
            [span("APPENDIX", 563, 20, font="Pterra")],
            [span("until here.", 36, 40)],
            [span("Alpha Domain Spells", 36, 60, font="Pterra")],
        ])])
        self.assertEqual(result["domains"][0]["grantedPowerEnglish"], "Granted Power: con- tinues until here.")
        self.assertEqual(result["domains"][0]["grantedPowerLines"][0]["text"], "Granted Power: con-")

    def test_shared_planar_rules_stop_at_domain(self):
        result = inventory_powers([page(0, [
            [span("PLANAR DOMAINS", 36, 40, font="Pterra")],
            [span("Consumes both choices.", 36, 60)],
            [span("Alignment required.", 292, 40)],
            [span("ALPHA DOMAIN", 292, 60, font="Pterra")],
            [span("Granted Powers: A and B.", 292, 80)],
            [span("Alpha Domain Spells", 292, 100, font="Pterra")],
        ])])
        self.assertEqual(len(result["sharedPlanarLines"]), 2)
        self.assertEqual(result["domains"][0]["grantedPowerEnglish"], "Granted Powers: A and B.")

    def test_full_width_sources_do_not_enter_power(self):
        result = inventory_powers([page(0, [
            [span("ALPHA DOMAIN", 292, 40, font="Pterra")],
            [span("Granted Power: Valid.", 292, 60)],
            [span("SOURCES", 36, 100, font="Pterra")],
            [span("Wrong content.", 292, 120)],
        ])])
        self.assertEqual(result["domains"][0]["grantedPowerEnglish"], "Granted Power: Valid.")

    def test_missing_power_and_duplicate_inputs_fail(self):
        with self.assertRaisesRegex(ValueError, "Missing Granted Power"):
            inventory_powers([page(0, [[span("ALPHA DOMAIN", 36, 40, font="Pterra")]])])
        with self.assertRaisesRegex(ValueError, "Duplicate source page"):
            inventory_powers([page(0, []), page(0, [])])
        with self.assertRaisesRegex(ValueError, "Duplicate domain heading"):
            inventory_powers([page(0, [
                [span("ALPHA DOMAIN", 36, 40, font="Pterra")],
                [span("Granted Power: A.", 36, 60)],
                [span("ALPHA DOMAIN", 36, 80, font="Pterra")],
                [span("Granted Power: B.", 36, 100)],
            ])])


if __name__ == "__main__":
    unittest.main()
