import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';

const ReservationPlanner = () => {
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedVehicleClass, setSelectedVehicleClass] = useState('');

  // Helper function to convert UTC date to local date (fixes timezone offset)
  const utcToLocalDate = (utcDateString: string): string => {
    const utcDate = new Date(utcDateString);
    // Get local date components
    const year = utcDate.getFullYear();
    const month = String(utcDate.getMonth() + 1).padStart(2, '0');
    const day = String(utcDate.getDate()).padStart(2, '0');
    // Return as local date string
    return `${year}-${month}-${day}T00:00:00.000Z`;
  };

  // Fetch schedule data
  const { data: scheduleData, isLoading, refetch } = useQuery({
    queryKey: ['schedule', selectedLocation, selectedVehicleClass, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        dateFrom: startDate,
        dateTo: endDate,
        ...(selectedLocation && { locationCode: selectedLocation }),
        ...(selectedVehicleClass && { vehicleClassId: selectedVehicleClass }),
      });
      const response = await fetch(`http://localhost:3001/api/v1/reservations/schedule?${params}`);
      const data = await response.json();
      
      // Fix timezone for all reservations
      if (data.vehicles) {
        data.vehicles = data.vehicles.map((vehicle: any) => ({
          ...vehicle,
          reservations: vehicle.reservations?.map((res: any) => ({
            ...res,
            dateOut: utcToLocalDate(res.dateOut),
            dateDue: utcToLocalDate(res.dateDue),
          })) || []
        }));
      }
      
      if (data.unassignedReservations) {
        data.unassignedReservations = data.unassignedReservations.map((res: any) => ({
          ...res,
          dateOut: utcToLocalDate(res.dateOut),
          dateDue: utcToLocalDate(res.dateDue),
        }));
      }
      
      return data;
    },
  });

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3001/api/v1/locations');
      return response.json();
    },
  });

  // Generate date columns (7 days)
  const generateDateColumns = () => {
    const dates = [];
    const start = new Date(startDate);
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(start, i));
    }
    return dates;
  };

  const dateColumns = generateDateColumns();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CHECKED_OUT':
        return 'bg-green-600'; // Green like RES-001 in demo
      case 'QUOTE':
        return 'bg-fuchsia-600'; // Magenta/Purple like RES-023 in demo
      case 'CONFIRMED':
        return 'bg-blue-600'; // Blue like RES-012, RES-034, RES-031 in demo
      case 'COMPLETED':
        return 'bg-green-700'; // Darker green for completed
      case 'CANCELLED':
        return 'bg-red-600'; // Red like RES-019, RES-027 in demo
      default:
        return 'bg-blue-600';
    }
  };

  // AI Auto-Assign function
  const handleAIAutoAssign = async () => {
    if (!confirm('🤖 Run AI Auto-Assign for all unassigned reservations?\n\nThe AI will automatically assign the best available vehicle to each unassigned reservation based on:\n✓ Vehicle availability\n✓ Vehicle age & condition\n✓ Fleet utilization\n✓ Customer preferences')) return;
    
    try {
      const params = new URLSearchParams();
      if (selectedLocation) params.append('locationCode', selectedLocation);
      
      const response = await fetch(`http://localhost:3001/api/v1/analytics/ai/auto-assign?${params}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to run AI Auto-Assign');
      }
      
      const result = await response.json();
      
      // Show detailed results
      let message = `✅ AI Auto-Assign Complete!\n\n`;
      message += `✓ Successfully assigned: ${result.assigned} reservation${result.assigned !== 1 ? 's' : ''}\n`;
      
      if (result.failed > 0) {
        message += `✗ Failed: ${result.failed} reservation${result.failed !== 1 ? 's' : ''}\n`;
      }
      
      if (result.assignments && result.assignments.length > 0) {
        message += `\nAssignments Made:\n`;
        result.assignments.slice(0, 3).forEach((assignment: any) => {
          message += `\n• ${assignment.reservationNumber}\n`;
          message += `  Score: ${assignment.score}/100\n`;
          if (assignment.reasons && assignment.reasons.length > 0) {
            message += `  ${assignment.reasons[0]}\n`;
          }
        });
        
        if (result.assignments.length > 3) {
          message += `\n... and ${result.assignments.length - 3} more`;
        }
      }
      
      alert(message);
      
      // Refresh the schedule to show new assignments
      refetch();
    } catch (error: any) {
      alert('❌ Error running AI Auto-Assign:\n\n' + error.message);
    }
  };

  // Refresh handler
  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">RentWorks</h1>
                <p className="text-xs text-gray-500">New Solution</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <button className="hover:text-gray-900">← Back</button>
              <span className="text-gray-400">Home Page &gt;</span>
              <span className="font-medium">Reservation-planner</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>
            <span className="text-sm text-gray-600">Guest User</span>
            <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-semibold">GU</span>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center space-x-4">
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Locations</option>
            {locations?.map((loc: any) => (
              <option key={loc.id} value={loc.code}>
                {loc.name}
              </option>
            ))}
          </select>

          <select
            value={selectedVehicleClass}
            onChange={(e) => setSelectedVehicleClass(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Vehicle Class</option>
            <option value="10">Economy</option>
            <option value="9">Standard</option>
            <option value="12">SUV</option>
            <option value="11">Luxury</option>
          </select>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Start:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">End:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md border">
            Days
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white border-b px-4 py-2">
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center space-x-2 border"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
          <button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center space-x-2 border">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Contract</span>
          </button>
          <button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center space-x-2 border">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Reservation</span>
          </button>
          <button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center space-x-2 border">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Options</span>
          </button>
          <button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center space-x-2 border">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print</span>
          </button>
          <button className="px-4 py-2 text-sm bg-teal-500 text-white rounded-md hover:bg-teal-600 flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span>Save</span>
          </button>
          <button 
            onClick={handleAIAutoAssign}
            className="px-4 py-2 text-sm bg-teal-500 text-white rounded-md hover:bg-teal-600 flex items-center space-x-2"
            title="AI-powered automatic vehicle assignment"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>AI Auto-Assign</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-250px)]">
        {/* Timeline Grid */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-500">Loading schedule...</div>
            </div>
          ) : (
            <div className="inline-block min-w-full">
              {/* Date Headers */}
              <div className="flex bg-white border-b sticky top-0 z-10" style={{ minWidth: 'max-content' }}>
                <div className="w-56 px-4 py-3 font-semibold text-sm border-r bg-gray-50 flex-shrink-0">
                  UNIT NUMBER
                </div>
                {dateColumns.map((date) => (
                  <div key={date.toString()} className="w-40 px-4 py-3 text-center border-r flex-shrink-0">
                    <div className="font-semibold text-sm">{format(date, 'M/d')}</div>
                    <div className="text-xs text-gray-500">{format(date, 'EEE')}</div>
                  </div>
                ))}
              </div>

              {/* Vehicle Rows */}
              {scheduleData?.vehicles?.map((vehicle: any) => (
                <div key={vehicle.id} className="flex border-b hover:bg-gray-50" style={{ minWidth: 'max-content' }}>
                  <div className="w-56 px-4 py-3 border-r flex-shrink-0">
                    <div className="font-semibold text-sm">{vehicle.unitNumber}</div>
                    <div className="text-xs text-gray-600">
                      {vehicle.make} {vehicle.model}
                    </div>
                    <div className="text-xs text-gray-500">{vehicle.vehicleClass.name}</div>
                  </div>
                  <div className="flex flex-1 relative" style={{ minWidth: `${dateColumns.length * 160}px` }}>
                    {dateColumns.map((date) => (
                      <div key={date.toString()} className="w-40 border-r border-gray-200 flex-shrink-0"></div>
                    ))}
                    {/* Reservation Cards */}
                    {vehicle.reservations?.map((reservation: any) => {
                      const resStart = new Date(reservation.dateOut);
                      const resEnd = new Date(reservation.dateDue);
                      const gridStart = new Date(startDate);
                      
                      const dayDiff = Math.floor(
                        (resStart.getTime() - gridStart.getTime()) / (1000 * 60 * 60 * 24)
                      );
                      const duration = Math.ceil(
                        (resEnd.getTime() - resStart.getTime()) / (1000 * 60 * 60 * 24)
                      );

                      if (dayDiff >= 0 && dayDiff < 7) {
                        return (
                          <div
                            key={reservation.id}
                            className={`absolute h-14 ${getStatusColor(
                              reservation.reservationStatus
                            )} rounded px-2 py-1.5 text-white text-xs m-1 cursor-pointer hover:shadow-lg transition-shadow overflow-hidden`}
                            style={{
                              left: `${dayDiff * 160}px`,
                              width: `${duration * 160 - 8}px`,
                              top: '4px',
                            }}
                            title={`${reservation.reservationNumber} - ${reservation.customer.firstName} ${reservation.customer.lastName}\n${reservation.reservationStatus}`}
                          >
                            <div className="font-bold text-xs">{reservation.reservationNumber.replace('RES-2025-', 'RES-')}</div>
                            <div className="text-xs opacity-95 font-medium">
                              {reservation.customer.firstName} {reservation.customer.lastName}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unassigned Reservations Panel */}
        <div className="w-80 bg-white border-l p-4">
          <div className="flex items-center space-x-2 mb-4">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="font-semibold text-sm">Unassigned Reservations</h3>
            {scheduleData?.unassignedReservations?.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                {scheduleData.unassignedReservations.length}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {scheduleData?.unassignedReservations?.length > 0 ? (
              scheduleData.unassignedReservations.map((reservation: any) => (
                <div key={reservation.id} className="border rounded-lg p-3 hover:shadow-md cursor-pointer transition-shadow bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm text-gray-900">
                      {reservation.reservationNumber.replace('RES-2025-', 'RES-')}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">{reservation.vehicleClass.name}</div>
                  </div>
                  <div className="text-sm text-gray-700 font-medium">
                    {reservation.customer.firstName} {reservation.customer.lastName}
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mt-2">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {format(new Date(reservation.dateOut), 'M/d')} - {format(new Date(reservation.dateDue), 'M/d')}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">
                ✅ All reservations assigned!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationPlanner;