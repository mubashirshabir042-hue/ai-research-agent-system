from src.graph import route_after_evaluation


def test_routes_to_generator_when_sufficient():
    state = {"sufficient": True, "iteration": 1}
    assert route_after_evaluation(state) == "generator"


def test_routes_back_to_planner_when_insufficient_and_iterations_remain():
    state = {"sufficient": False, "iteration": 1}
    assert route_after_evaluation(state) == "planner"


def test_forces_generator_once_max_iterations_reached():
    state = {"sufficient": False, "iteration": 2}
    assert route_after_evaluation(state) == "generator"
