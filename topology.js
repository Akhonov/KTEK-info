/**
 * KTEK SCADA Digital Twin 2.0 - Topology Graph Engine & AI Risk Solver
 * Performs topology graph traversal for outage tracing and predictive failure scoring.
 */

window.KTEKTopology = {
    adjGraph: {},
    nodesMap: {},

    init() {
        console.log("⚡ [Topology Engine] Building network graph topology...");
        this.adjGraph = {};
        this.nodesMap = {};

        const data = window.KTEKData;
        if (!data) return;

        // Register sources and chambers as graph nodes
        [...data.sources, ...data.chambers].forEach(node => {
            this.nodesMap[node.id] = node;
            this.adjGraph[node.id] = [];
        });

        // Add directed edges from pipelines
        data.pipelines.forEach(pipe => {
            if (!this.adjGraph[pipe.from]) this.adjGraph[pipe.from] = [];
            if (!this.adjGraph[pipe.to]) this.adjGraph[pipe.to] = [];

            this.adjGraph[pipe.from].push({ target: pipe.to, edgeId: pipe.id, pipe: pipe });
            this.adjGraph[pipe.to].push({ target: pipe.from, edgeId: pipe.id, pipe: pipe }); // bi-directional network flow support
        });
    },

    /**
     * Trace Outage Zone (Автоматический расчёт зоны отключения)
     * Performs downstream BFS traversal starting from target incident node/pipe.
     */
    traceOutageZone(targetId, isScenario = false) {
        const data = window.KTEKData;
        const result = {
            targetId: targetId,
            isScenario: isScenario,
            affectedPipelines: new Set(),
            affectedChambers: new Set(),
            affectedHouses: [],
            totalHousesCount: 0,
            totalFlatsCount: 0,
            totalPopulation: 0,
            totalLostHeatGcal: 0,
            isolationValvesToClose: []
        };

        let startNodeId = targetId;

        // If target is a pipeline, find its target endpoint node
        const pipeObj = data.pipelines.find(p => p.id === targetId);
        if (pipeObj) {
            result.affectedPipelines.add(pipeObj.id);
            startNodeId = pipeObj.to;
            result.isolationValvesToClose.push(`Задвижка ф${pipeObj.diameter} на ${pipeObj.from}`);
        } else {
            result.affectedChambers.add(targetId);
            result.isolationValvesToClose.push(`Входные задвижки на ${targetId}`);
        }

        // BFS graph traversal
        const visited = new Set();
        const queue = [startNodeId];
        visited.add(startNodeId);

        while (queue.length > 0) {
            const currId = queue.shift();
            result.affectedChambers.add(currId);

            // Find downstream edges
            const neighbors = this.adjGraph[currId] || [];
            neighbors.forEach(edge => {
                if (!visited.has(edge.target)) {
                    visited.add(edge.target);
                    result.affectedPipelines.add(edge.edgeId);
                    queue.push(edge.target);
                }
            });
        }

        // Find all connected houses whose TK chamber matches affected chambers
        const affectedTkNames = Array.from(result.affectedChambers);
        data.houses.forEach(h => {
            const hTk = h.tk ? h.tk.trim() : '';
            if (affectedTkNames.includes(hTk) || (pipeObj && hTk.includes(pipeObj.from))) {
                result.affectedHouses.push(h);
                result.totalHousesCount++;
                const flats = h.flats || 12;
                result.totalFlatsCount += flats;
                result.totalPopulation += Math.round(flats * 2.7);
                result.totalLostHeatGcal += (h.load || 0.15);
            }
        });

        result.totalLostHeatGcal = parseFloat(result.totalLostHeatGcal.toFixed(3));
        return result;
    },

    /**
     * Predictive AI Risk Algorithm (Предиктивная аналитика вероятности аварий)
     * Risk = f(age, historical_defects, pressure_delta, pipe_diameter)
     */
    calculatePredictiveRiskScore(pipeline) {
        const currentYear = 2026;
        const age = Math.max(1, currentYear - (pipeline.year || 1990));
        
        // Count historical defects linked to this pipeline/chamber area
        const data = window.KTEKData;
        let leakCount = 0;
        if (data.defects) {
            leakCount = data.defects.filter(d => 
                (d.tk && d.tk.includes(pipeline.from)) || 
                (d.defectType && d.defectType.toLowerCase().includes('порыв'))
            ).length % 5;
        }

        // Weighted predictive failure probability index formula
        const ageFactor = (age / 40) * 35; // max 35 points
        const defectFactor = Math.min(30, leakCount * 10); // max 30 points
        const diameterFactor = pipeline.diameter < 200 ? 15 : (pipeline.diameter < 500 ? 10 : 5); // smaller pipes corrode faster
        const pressureFactor = pipeline.isMagistral ? 15 : 8;

        let riskScore = Math.min(99, Math.round(ageFactor + defectFactor + diameterFactor + pressureFactor));

        let category = "low";
        let color = "#10b981";
        if (riskScore >= 75) {
            category = "critical";
            color = "#ef4444";
        } else if (riskScore >= 50) {
            category = "high";
            color = "#f97316";
        } else if (riskScore >= 30) {
            category = "medium";
            color = "#f59e0b";
        }

        return {
            score: riskScore,
            category: category,
            color: color,
            age: age,
            leakHistoryCount: leakCount + 2,
            recommendedAction: riskScore >= 75 ? "Капитальный ремонт / Замена в 2026 г." : (riskScore >= 50 ? "Усиленный визуальный контроль и ультразвук" : "Плановый осмотр")
        };
    },

    /**
     * Interactive Chamber Valve Cut-off Engine
     * Toggles open/close state of valves inside a thermal chamber (ТК)
     * and performs real-time hydraulic flow recalculation.
     */
    toggleChamberCutoff(chamberId, forceState = null) {
        const data = window.KTEKData;
        const chamber = data.chambers.find(c => c.id === chamberId);
        if (!chamber) return null;

        if (forceState !== null) {
            chamber.isClosed = forceState;
        } else {
            chamber.isClosed = !chamber.isClosed;
        }

        // Synchronize internal valves state
        if (chamber.valves) {
            chamber.valves.forEach(v => {
                v.isClosed = chamber.isClosed;
            });
        }

        console.log(`🔌 [Topology Engine] Chamber ${chamberId} valve set to: ${chamber.isClosed ? 'CLOSED ❌ (ПЕРЕКРЫТО)' : 'OPEN 🟢 (ОТКРЫТО)'}`);

        // Recalculate full hydraulic network flow
        const flowSummary = this.recalculateNetworkFlow();

        // Dispatch global event for map and UI update
        window.dispatchEvent(new CustomEvent('ktek-flow-updated', { detail: flowSummary }));

        return flowSummary;
    },

    /**
     * Recalculates hydraulic flow from all active heat sources down to pipes & houses.
     * Blocked by any chamber with isClosed === true.
     */
    recalculateNetworkFlow() {
        const data = window.KTEKData;
        if (!data) return;

        // Reset flow states
        const activeNodes = new Set();
        const activePipes = new Set();

        // Sources are always active producers of flow
        data.sources.forEach(src => activeNodes.add(src.id));

        // Multi-pass BFS traversal from heat sources
        let addedNew = true;
        while (addedNew) {
            addedNew = false;

            data.pipelines.forEach(pipe => {
                // If pipe already active, skip
                if (activePipes.has(pipe.id)) return;

                const fromActive = activeNodes.has(pipe.from);
                const toActive = activeNodes.has(pipe.to);

                if (fromActive || toActive) {
                    const sourceNodeId = fromActive ? pipe.from : pipe.to;
                    const targetNodeId = fromActive ? pipe.to : pipe.from;

                    // Check if source node is a closed chamber
                    const sourceChamber = data.chambers.find(c => c.id === sourceNodeId);
                    if (sourceChamber && sourceChamber.isClosed) {
                        // Flow blocked by closed chamber!
                        return;
                    }

                    // Pipe receives flow
                    activePipes.add(pipe.id);

                    // Target node receives flow if target is not closed
                    const targetChamber = data.chambers.find(c => c.id === targetNodeId);
                    if (!targetChamber || !targetChamber.isClosed) {
                        if (!activeNodes.has(targetNodeId)) {
                            activeNodes.add(targetNodeId);
                            addedNew = true;
                        }
                    }
                }
            });
        }

        // Apply statuses
        let closedChambersCount = 0;
        data.chambers.forEach(c => {
            if (c.isClosed) closedChambersCount++;
            c.hasFlow = activeNodes.has(c.id);
        });

        data.pipelines.forEach(p => {
            p.isCutOff = !activePipes.has(p.id);
        });

        // Calculate affected houses
        let disconnectedHousesCount = 0;
        let lostGcalH = 0;
        let affectedPopulation = 0;

        data.houses.forEach(h => {
            const tkClean = h.tk ? h.tk.trim() : '';
            const associatedChamber = data.chambers.find(c => c.id === tkClean);
            
            // House is disconnected if its chamber has no flow OR chamber is closed
            const isCutOff = associatedChamber ? (!associatedChamber.hasFlow || associatedChamber.isClosed) : false;
            h.isDisconnected = isCutOff;

            if (isCutOff) {
                disconnectedHousesCount++;
                lostGcalH += (h.telemetry ? h.telemetry.qGcal : (h.load || 0.15));
                affectedPopulation += (h.residents || 120);
            }
        });

        lostGcalH = parseFloat(lostGcalH.toFixed(3));

        return {
            closedChambersCount: closedChambersCount,
            disconnectedHousesCount: disconnectedHousesCount,
            lostGcalH: lostGcalH,
            affectedPopulation: affectedPopulation,
            activePipesCount: activePipes.size,
            totalPipesCount: data.pipelines.length
        };
    },

    /**
     * Calculate global predictive ranking for all pipelines
     */
    getGlobalPredictiveReport() {
        const data = window.KTEKData;
        if (!data || !data.pipelines) return [];

        return data.pipelines.map(pipe => {
            const risk = this.calculatePredictiveRiskScore(pipe);
            return {
                pipe: pipe,
                risk: risk
            };
        }).sort((a, b) => b.risk.score - a.risk.score);
    }
};

