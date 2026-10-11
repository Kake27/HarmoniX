from app.processing.analysis.base import BaseAnalyzer


_ANALYZERS: dict[str, type[BaseAnalyzer]] = {}


def register_analyzer(analyzer_class: type[BaseAnalyzer]) -> type[BaseAnalyzer]:
    name = analyzer_class.name

    if not name:
        raise ValueError("Every analyzer must define a name.")

    if name in _ANALYZERS:
        raise ValueError(f"Analyzer '{name}' is already registered.")

    _ANALYZERS[name] = analyzer_class
    return analyzer_class


def get_analyzers() -> list[BaseAnalyzer]:
    """Return fresh analyzer instances in a deterministic order."""
    return [
        analyzer_class()
        for _, analyzer_class in sorted(_ANALYZERS.items())
    ]