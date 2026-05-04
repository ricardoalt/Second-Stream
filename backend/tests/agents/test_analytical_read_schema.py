import pytest
from pydantic import ValidationError

from app.agents.analytical_read_schema import AnalyticalTable, Cell


def _row(*values: str) -> list[Cell]:
    return [Cell(value=value) for value in values]


def test_analytical_table_accepts_rows_matching_headers():
    table = AnalyticalTable(
        title="Chemistry read",
        headers=["Parameter", "Site A", "Site B"],
        rows=[_row("pH", "13.1", "13.4"), _row("Sulfide", "0.7", "0.2")],
    )

    assert len(table.rows) == 2


def test_analytical_table_rejects_row_with_more_cells_than_headers():
    with pytest.raises(ValidationError, match="row 2 has 4 cells but headers has 3"):
        AnalyticalTable(
            title="Chemistry read",
            headers=["Parameter", "Site A", "Site B"],
            rows=[_row("pH", "13.1", "13.4"), _row("Sulfide", "0.7", "0.2", "extra")],
        )


def test_analytical_table_rejects_row_with_fewer_cells_than_headers():
    with pytest.raises(ValidationError, match="row 1 has 2 cells but headers has 3"):
        AnalyticalTable(
            title="Chemistry read",
            headers=["Parameter", "Site A", "Site B"],
            rows=[_row("pH", "13.1")],
        )
